import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const ACTIVE_BASE_STATUSES = new Set(['ACTIVE', 'APPROVED']);
const EXPIRY_WARNING_DAYS = 60;
const PRIVILEGED_APPROVER_ROLES = new Set(['SUPER_ADMIN']);
const STALE_APPROVAL_DAYS = 3;
const STALE_SIGNATURE_DAYS = 3;

type HrContractRuntimeSettings = {
  template: {
    accentColor: string;
    headerTitle: string;
    footerNote: string;
    introductionText: string;
    showSignatureLines: boolean;
  };
  documentPolicy: {
    requiredDocumentTypes: string[];
    allowSupportingDocuments: boolean;
    requireSignedContractUpload: boolean;
    requireGeneratedContractPdf: boolean;
  };
  numbering: {
    contractNumberPrefix: string;
    renewalNumberPrefix: string;
  };
  notifications: {
    approvalTurnNotificationsEnabled: boolean;
    approvalTurnRoleFallbackEnabled: boolean;
    expiryDigestEnabled: boolean;
    staleApprovalDigestEnabled: boolean;
    staleSignatureDigestEnabled: boolean;
    staleApprovalReminderDays: number;
    staleSignatureReminderDays: number;
    digestRecipientRoles: string[];
  };
};

@Injectable()
export class HrContractsService {
  private readonly logger = new Logger(HrContractsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private normalizeType(value?: string | null) {
    return (value || 'CONTRACT').trim().toUpperCase();
  }

  private normalizeStatus(value?: string | null) {
    return (value || 'DRAFT').trim().toUpperCase();
  }

  private normalizeRole(value?: string | null) {
    return (value || 'STAFF').trim().toUpperCase();
  }

  private canTerminate(derivedStatus: string) {
    return (
      derivedStatus === 'ACTIVE' ||
      derivedStatus === 'APPROVED' ||
      derivedStatus === 'AWAITING_SIGNATURE' ||
      derivedStatus === 'EXPIRING_SOON'
    );
  }

  private canRenew(derivedStatus: string) {
    return (
      derivedStatus === 'ACTIVE' ||
      derivedStatus === 'APPROVED' ||
      derivedStatus === 'EXPIRING_SOON' ||
      derivedStatus === 'EXPIRED'
    );
  }

  private canSubmit(status: string) {
    const raw = this.normalizeStatus(status);
    return raw === 'DRAFT' || raw === 'REJECTED';
  }

  private canEditContract(status: string) {
    const raw = this.normalizeStatus(status);
    return raw === 'DRAFT' || raw === 'REJECTED';
  }

  private canApprove(status: string) {
    return this.normalizeStatus(status) === 'PENDING_APPROVAL';
  }

  private canSign(status: string) {
    return this.normalizeStatus(status) === 'AWAITING_SIGNATURE';
  }

  private canActOnApprovalStep(actorRole: string, requiredRole: string) {
    const normalizedActorRole = this.normalizeRole(actorRole);
    return (
      normalizedActorRole === this.normalizeRole(requiredRole) ||
      PRIVILEGED_APPROVER_ROLES.has(normalizedActorRole)
    );
  }

  private fallbackApprovalRoute(contractType: string) {
    return {
      id: 'system-fallback',
      name: `System Fallback · ${this.normalizeType(contractType)}`,
      hotelId: null,
      contractType: this.normalizeType(contractType),
      isDefault: true,
      isActive: true,
      steps: [
        { stepOrder: 1, role: 'MANAGER', required: true, userId: null },
        { stepOrder: 2, role: 'ADMIN', required: true, userId: null },
      ],
    };
  }

  private async resolveApprovalRoute(hotelId: string, contractType: string) {
    const normalizedType = this.normalizeType(contractType);

    const exactRoute = await (this.prisma as any).hrContractApprovalRoute.findFirst({
      where: {
        hotelId,
        contractType: normalizedType,
        isActive: true,
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    } as any);

    if (exactRoute) return exactRoute as any;

    const defaultRoute = await (this.prisma as any).hrContractApprovalRoute.findFirst({
      where: {
        hotelId,
        isDefault: true,
        isActive: true,
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    } as any);

    if (defaultRoute) return defaultRoute as any;

    return this.fallbackApprovalRoute(normalizedType);
  }

  private validateApprovalSteps(steps: Array<{ stepOrder: number; role: string }>) {
    if (!steps.length) {
      throw new BadRequestException('At least one approval step is required.');
    }

    const seenOrders = new Set<number>();
    for (const step of steps) {
      if (seenOrders.has(step.stepOrder)) {
        throw new BadRequestException('Approval step orders must be unique.');
      }
      seenOrders.add(step.stepOrder);
      if (!this.normalizeRole(step.role)) {
        throw new BadRequestException('Each approval step must have a role.');
      }
    }
  }

  private async recordAuditLog(
    tx: Prisma.TransactionClient | PrismaService,
    input: {
      hotelId: string;
      contractId: string;
      actorUserId?: string | null;
      action: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    await (tx as any).hrContractAuditLog.create({
      data: {
        hotelId: input.hotelId,
        contractId: input.contractId,
        actorUserId: input.actorUserId || null,
        action: input.action,
        fromStatus: input.fromStatus || null,
        toStatus: input.toStatus || null,
        metadata: input.metadata || null,
      },
    });
  }

  private async getContractSettings(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, contractExpiryWarningDays: true, hrContractSettings: true },
    } as any);

    const typedHotel = hotel as any;

    return {
      hotelName: typedHotel?.name ?? 'HotelOS',
      contractExpiryWarningDays:
        typedHotel?.contractExpiryWarningDays ?? EXPIRY_WARNING_DAYS,
      hrContractSettings: this.coerceHrContractSettings(typedHotel?.hrContractSettings),
    };
  }

  private buildDefaultHrContractSettings(): HrContractRuntimeSettings {
    return {
      template: {
        accentColor: '#1d4ed8',
        headerTitle: 'Employment Contract',
        footerNote:
          'This generated document is the system copy of the contract summary. Signed copies and supporting documents should be attached to the contract record.',
        introductionText:
          'This employment contract records the current staff assignment, compensation, and contract terms approved by the hotel.',
        showSignatureLines: true,
      },
      documentPolicy: {
        requiredDocumentTypes: ['SIGNED_CONTRACT'],
        allowSupportingDocuments: true,
        requireSignedContractUpload: true,
        requireGeneratedContractPdf: true,
      },
      numbering: {
        contractNumberPrefix: 'CTR',
        renewalNumberPrefix: 'REN',
      },
      notifications: {
        approvalTurnNotificationsEnabled: true,
        approvalTurnRoleFallbackEnabled: true,
        expiryDigestEnabled: true,
        staleApprovalDigestEnabled: true,
        staleSignatureDigestEnabled: true,
        staleApprovalReminderDays: STALE_APPROVAL_DAYS,
        staleSignatureReminderDays: STALE_SIGNATURE_DAYS,
        digestRecipientRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      },
    };
  }

  private coerceHrContractSettings(value: unknown): HrContractRuntimeSettings {
    const defaults = this.buildDefaultHrContractSettings();

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaults;
    }

    const raw = value as Record<string, unknown>;
    const rawTemplate =
      raw.template && typeof raw.template === 'object' && !Array.isArray(raw.template)
        ? (raw.template as Record<string, unknown>)
        : {};
    const rawDocumentPolicy =
      raw.documentPolicy &&
      typeof raw.documentPolicy === 'object' &&
      !Array.isArray(raw.documentPolicy)
        ? (raw.documentPolicy as Record<string, unknown>)
        : {};
    const rawNumbering =
      raw.numbering && typeof raw.numbering === 'object' && !Array.isArray(raw.numbering)
        ? (raw.numbering as Record<string, unknown>)
        : {};
    const rawNotifications =
      raw.notifications && typeof raw.notifications === 'object' && !Array.isArray(raw.notifications)
        ? (raw.notifications as Record<string, unknown>)
        : {};

    const requiredDocumentTypes = Array.isArray(rawDocumentPolicy.requiredDocumentTypes)
      ? rawDocumentPolicy.requiredDocumentTypes
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim().toUpperCase())
      : defaults.documentPolicy.requiredDocumentTypes;

    return {
      template: {
        accentColor:
          typeof rawTemplate.accentColor === 'string' && rawTemplate.accentColor.trim()
            ? rawTemplate.accentColor.trim()
            : defaults.template.accentColor,
        headerTitle:
          typeof rawTemplate.headerTitle === 'string' && rawTemplate.headerTitle.trim()
            ? rawTemplate.headerTitle.trim()
            : defaults.template.headerTitle,
        footerNote:
          typeof rawTemplate.footerNote === 'string' && rawTemplate.footerNote.trim()
            ? rawTemplate.footerNote.trim()
            : defaults.template.footerNote,
        introductionText:
          typeof rawTemplate.introductionText === 'string' &&
          rawTemplate.introductionText.trim()
            ? rawTemplate.introductionText.trim()
            : defaults.template.introductionText,
        showSignatureLines:
          typeof rawTemplate.showSignatureLines === 'boolean'
            ? rawTemplate.showSignatureLines
            : defaults.template.showSignatureLines,
      },
      documentPolicy: {
        requiredDocumentTypes: requiredDocumentTypes.length
          ? requiredDocumentTypes
          : defaults.documentPolicy.requiredDocumentTypes,
        allowSupportingDocuments:
          typeof rawDocumentPolicy.allowSupportingDocuments === 'boolean'
            ? rawDocumentPolicy.allowSupportingDocuments
            : defaults.documentPolicy.allowSupportingDocuments,
        requireSignedContractUpload:
          typeof rawDocumentPolicy.requireSignedContractUpload === 'boolean'
            ? rawDocumentPolicy.requireSignedContractUpload
            : defaults.documentPolicy.requireSignedContractUpload,
        requireGeneratedContractPdf:
          typeof rawDocumentPolicy.requireGeneratedContractPdf === 'boolean'
            ? rawDocumentPolicy.requireGeneratedContractPdf
            : defaults.documentPolicy.requireGeneratedContractPdf,
      },
      numbering: {
        contractNumberPrefix:
          typeof rawNumbering.contractNumberPrefix === 'string' &&
          rawNumbering.contractNumberPrefix.trim()
            ? rawNumbering.contractNumberPrefix.trim().toUpperCase()
            : defaults.numbering.contractNumberPrefix,
        renewalNumberPrefix:
          typeof rawNumbering.renewalNumberPrefix === 'string' &&
          rawNumbering.renewalNumberPrefix.trim()
            ? rawNumbering.renewalNumberPrefix.trim().toUpperCase()
            : defaults.numbering.renewalNumberPrefix,
      },
      notifications: {
        approvalTurnNotificationsEnabled:
          typeof rawNotifications.approvalTurnNotificationsEnabled === 'boolean'
            ? rawNotifications.approvalTurnNotificationsEnabled
            : defaults.notifications.approvalTurnNotificationsEnabled,
        approvalTurnRoleFallbackEnabled:
          typeof rawNotifications.approvalTurnRoleFallbackEnabled === 'boolean'
            ? rawNotifications.approvalTurnRoleFallbackEnabled
            : defaults.notifications.approvalTurnRoleFallbackEnabled,
        expiryDigestEnabled:
          typeof rawNotifications.expiryDigestEnabled === 'boolean'
            ? rawNotifications.expiryDigestEnabled
            : defaults.notifications.expiryDigestEnabled,
        staleApprovalDigestEnabled:
          typeof rawNotifications.staleApprovalDigestEnabled === 'boolean'
            ? rawNotifications.staleApprovalDigestEnabled
            : defaults.notifications.staleApprovalDigestEnabled,
        staleSignatureDigestEnabled:
          typeof rawNotifications.staleSignatureDigestEnabled === 'boolean'
            ? rawNotifications.staleSignatureDigestEnabled
            : defaults.notifications.staleSignatureDigestEnabled,
        staleApprovalReminderDays:
          typeof rawNotifications.staleApprovalReminderDays === 'number' &&
          Number.isFinite(rawNotifications.staleApprovalReminderDays) &&
          rawNotifications.staleApprovalReminderDays >= 1 &&
          rawNotifications.staleApprovalReminderDays <= 30
            ? Math.trunc(rawNotifications.staleApprovalReminderDays)
            : defaults.notifications.staleApprovalReminderDays,
        staleSignatureReminderDays:
          typeof rawNotifications.staleSignatureReminderDays === 'number' &&
          Number.isFinite(rawNotifications.staleSignatureReminderDays) &&
          rawNotifications.staleSignatureReminderDays >= 1 &&
          rawNotifications.staleSignatureReminderDays <= 30
            ? Math.trunc(rawNotifications.staleSignatureReminderDays)
            : defaults.notifications.staleSignatureReminderDays,
        digestRecipientRoles: Array.isArray(rawNotifications.digestRecipientRoles)
          ? rawNotifications.digestRecipientRoles
              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
              .map((item) => item.trim().toUpperCase())
          : defaults.notifications.digestRecipientRoles,
      },
    };
  }

  private async hasExistingContractNotification(args: {
    hotelId: string;
    event: 'hrContractExpiry' | 'hrContractApproval';
    alertKind: string;
    alertDate: string;
  }) {
    const metadataWhere = [
      {
        metadata: {
          path: ['alertKind'],
          equals: args.alertKind,
        },
      },
      {
        metadata: {
          path: ['alertDate'],
          equals: args.alertDate,
        },
      },
    ];

    const [notificationMatch, emailLogMatch] = await Promise.all([
      this.prisma.notification.findFirst({
        where: {
          hotelId: args.hotelId,
          event: args.event,
          AND: metadataWhere,
        },
        select: { id: true },
      }),
      this.prisma.emailDeliveryLog.findFirst({
        where: {
          hotelId: args.hotelId,
          event: args.event,
          AND: metadataWhere,
        },
        select: { id: true },
      }),
    ]);

    return Boolean(notificationMatch || emailLogMatch);
  }

  private buildExpiryDigestEmail(args: {
    hotelName: string;
    warningDays: number;
    contracts: Array<{
      contractNo: string;
      staffNameSnapshot: string;
      departmentSnapshot: string;
      positionSnapshot: string;
      endDate: Date;
    }>;
  }) {
    const rowsText = args.contracts
      .map(
        (contract) =>
          `- ${contract.contractNo}: ${contract.staffNameSnapshot} · ${contract.departmentSnapshot} · ends ${dayjs(contract.endDate).format('YYYY-MM-DD')}`,
      )
      .join('\n');

    const rowsHtml = args.contracts
      .map(
        (contract) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(contract.contractNo)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(contract.staffNameSnapshot)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(contract.departmentSnapshot)}</td>
            <td style="padding: 6px 0;">${escapeHtml(dayjs(contract.endDate).format('YYYY-MM-DD'))}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `HR contracts expiring within ${args.warningDays} days`,
      text:
        `${args.hotelName}: ${args.contracts.length} contract(s) are expiring within ${args.warningDays} days.\n` +
        rowsText,
      html: `
        <div>
          <p style="margin: 0 0 12px;">${escapeHtml(args.hotelName)} has <strong>${args.contracts.length}</strong> contract(s) expiring within <strong>${args.warningDays}</strong> days.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Contract</th>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Staff</th>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Department</th>
                <th style="text-align:left; padding: 12px 0 10px; color:#64748b; font-size:12px;">End Date</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `,
    };
  }

  private buildStaleApprovalEmail(args: {
    hotelName: string;
    staleDays: number;
    contracts: Array<{
      contractNo: string;
      staffNameSnapshot: string;
      submittedAt: Date;
      pendingRole?: string | null;
    }>;
  }) {
    const rowsText = args.contracts
      .map(
        (contract) =>
          `- ${contract.contractNo}: ${contract.staffNameSnapshot} · submitted ${dayjs(contract.submittedAt).format('YYYY-MM-DD')} · waiting on ${contract.pendingRole ?? 'approval'}`,
      )
      .join('\n');

    const rowsHtml = args.contracts
      .map(
        (contract) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(contract.contractNo)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(contract.staffNameSnapshot)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(dayjs(contract.submittedAt).format('YYYY-MM-DD'))}</td>
            <td style="padding: 6px 0;">${escapeHtml(contract.pendingRole ?? 'Approval')}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `HR contracts with stale approvals`,
      text:
        `${args.hotelName}: ${args.contracts.length} contract(s) have been pending approval for at least ${args.staleDays} days.\n` +
        rowsText,
      html: `
        <div>
          <p style="margin: 0 0 12px;">${escapeHtml(args.hotelName)} has <strong>${args.contracts.length}</strong> contract(s) pending approval for at least <strong>${args.staleDays}</strong> days.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Contract</th>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Staff</th>
                <th style="text-align:left; padding: 12px 16px 10px 0; color:#64748b; font-size:12px;">Submitted</th>
                <th style="text-align:left; padding: 12px 0 10px; color:#64748b; font-size:12px;">Pending Step</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `,
    };
  }

  private async resolveDigestRecipientUserIds(hotelId: string, roles: string[]) {
    const normalizedRoles = roles
      .map((role) => this.normalizeRole(role))
      .filter((role, index, array) => role && array.indexOf(role) === index);

    if (!normalizedRoles.length) return undefined;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: normalizedRoles as any },
        staff: {
          hotelId,
        },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private getMissingRequiredDocuments(args: {
    availableDocumentTypes: Set<string>;
    settings: HrContractRuntimeSettings;
    stage: 'submit' | 'sign';
  }) {
    const missing: string[] = [];

    if (
      args.settings.documentPolicy.requireGeneratedContractPdf &&
      !args.availableDocumentTypes.has('CONTRACT_DOCUMENT')
    ) {
      missing.push('Generated contract PDF');
    }

    const requiredTypes = args.settings.documentPolicy.requiredDocumentTypes.filter((type) => {
      if (args.stage === 'submit' && type === 'SIGNED_CONTRACT') return false;
      return !args.availableDocumentTypes.has(type);
    });

    if (
      args.stage === 'sign' &&
      args.settings.documentPolicy.requireSignedContractUpload &&
      !args.availableDocumentTypes.has('SIGNED_CONTRACT') &&
      !requiredTypes.includes('SIGNED_CONTRACT')
    ) {
      requiredTypes.unshift('SIGNED_CONTRACT');
    }

    return {
      missingLabels: [
        ...missing,
        ...requiredTypes.map((type) => this.humanizeValue(type)),
      ],
    };
  }

  private assertDocumentPolicySatisfied(args: {
    availableDocumentTypes: Set<string>;
    settings: HrContractRuntimeSettings;
    stage: 'submit' | 'sign';
  }) {
    const { missingLabels } = this.getMissingRequiredDocuments(args);
    if (!missingLabels.length) return;

    if (args.stage === 'submit') {
      throw new BadRequestException(
        `This contract is missing required documents for submission: ${missingLabels.join(', ')}.`,
      );
    }

    throw new BadRequestException(
      `This contract is missing required documents for activation: ${missingLabels.join(', ')}.`,
    );
  }

  private assertDirectActivationAllowed(args: {
    settings: HrContractRuntimeSettings;
    source: 'create' | 'renew';
  }) {
    const blockers: string[] = [];

    if (args.settings.documentPolicy.requireGeneratedContractPdf) {
      blockers.push('generated contract PDF');
    }
    if (args.settings.documentPolicy.requireSignedContractUpload) {
      blockers.push('signed contract upload');
    }
    if (args.settings.documentPolicy.requiredDocumentTypes.length) {
      blockers.push(
        ...args.settings.documentPolicy.requiredDocumentTypes.map((type) =>
          this.humanizeValue(type),
        ),
      );
    }

    const uniqueBlockers = blockers.filter(
      (item, index, array) => item && array.indexOf(item) === index,
    );

    if (!uniqueBlockers.length) return;

    throw new BadRequestException(
      `This hotel's contract policy does not allow direct activation during ${args.source}. Create the contract as a draft first, then complete the required workflow and documents: ${uniqueBlockers.join(', ')}.`,
    );
  }

  private async resolveApprovalRecipientUserIds(args: {
    hotelId: string;
    requiredRole: string;
    assignedUserId?: string | null;
    allowRoleFallback?: boolean;
  }) {
    if (args.assignedUserId) {
      const assigned = await this.prisma.user.findFirst({
        where: {
          id: args.assignedUserId,
          isActive: true,
          staff: {
            hotelId: args.hotelId,
          },
        },
        select: { id: true },
      });

      return assigned ? [assigned.id] : [];
    }

    if (args.allowRoleFallback === false) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        staff: {
          hotelId: args.hotelId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    return users
      .filter((user) => this.canActOnApprovalStep(user.role, args.requiredRole))
      .map((user) => user.id);
  }

  private buildApproverTurnEmail(args: {
    hotelName: string;
    contractNo: string;
    staffNameSnapshot: string;
    departmentSnapshot: string;
    positionSnapshot: string;
    stepOrder: number;
    role: string;
    submittedAt?: Date | null;
    reason: 'submitted' | 'advanced';
  }) {
    const intro =
      args.reason === 'submitted'
        ? 'A contract has just been submitted and is ready for your review.'
        : 'A contract approval step has been completed and this contract is now waiting on your review.';
    const submittedLabel = args.submittedAt
      ? dayjs(args.submittedAt).format('YYYY-MM-DD HH:mm')
      : 'Just now';

    return {
      subject: `Approval needed: ${args.contractNo}`,
      text:
        `${intro}\n` +
        `Contract: ${args.contractNo}\n` +
        `Staff: ${args.staffNameSnapshot}\n` +
        `Department: ${args.departmentSnapshot}\n` +
        `Position: ${args.positionSnapshot}\n` +
        `Approval step: ${args.stepOrder} (${args.role})\n` +
        `Submitted: ${submittedLabel}`,
      html: `
        <div>
          <p style="margin: 0 0 12px;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
            <tbody>
              <tr><td style="padding: 6px 12px 6px 0; color:#64748b;">Contract</td><td style="padding: 6px 0;">${escapeHtml(args.contractNo)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color:#64748b;">Staff</td><td style="padding: 6px 0;">${escapeHtml(args.staffNameSnapshot)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color:#64748b;">Department</td><td style="padding: 6px 0;">${escapeHtml(args.departmentSnapshot)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color:#64748b;">Position</td><td style="padding: 6px 0;">${escapeHtml(args.positionSnapshot)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color:#64748b;">Approval Step</td><td style="padding: 6px 0;">${escapeHtml(String(args.stepOrder))} · ${escapeHtml(args.role)}</td></tr>
              <tr><td style="padding: 6px 12px 0 0; color:#64748b;">Submitted</td><td style="padding: 6px 0 0;">${escapeHtml(submittedLabel)}</td></tr>
            </tbody>
          </table>
          <p style="margin: 12px 0 0;">Open HR Contracts in ${escapeHtml(args.hotelName)} to review this step.</p>
        </div>
      `,
    };
  }

  private async dispatchApproverTurnNotification(args: {
    hotelId: string;
    contractId: string;
    contractNo: string;
    staffNameSnapshot: string;
    departmentSnapshot: string;
    positionSnapshot: string;
    submittedAt?: Date | null;
    stepOrder: number;
    role: string;
    assignedUserId?: string | null;
    reason: 'submitted' | 'advanced';
  }) {
    const settings = await this.getContractSettings(args.hotelId);
    if (!settings.hrContractSettings.notifications.approvalTurnNotificationsEnabled) {
      return { notified: false, recipients: 0 };
    }

    const recipientUserIds = await this.resolveApprovalRecipientUserIds({
      hotelId: args.hotelId,
      requiredRole: args.role,
      assignedUserId: args.assignedUserId || null,
      allowRoleFallback: settings.hrContractSettings.notifications.approvalTurnRoleFallbackEnabled,
    });

    if (!recipientUserIds.length) {
      return { notified: false, recipients: 0 };
    }

    const email = this.buildApproverTurnEmail({
      hotelName: settings.hotelName,
      contractNo: args.contractNo,
      staffNameSnapshot: args.staffNameSnapshot,
      departmentSnapshot: args.departmentSnapshot,
      positionSnapshot: args.positionSnapshot,
      stepOrder: args.stepOrder,
      role: args.role,
      submittedAt: args.submittedAt,
      reason: args.reason,
    });

    await this.notifications.dispatch({
      hotelId: args.hotelId,
      event: 'hrContractApproval',
      recipientUserIds,
      email,
      inApp: {
        title: `Approval needed · ${args.contractNo}`,
        message: `${args.staffNameSnapshot}'s contract is waiting on step ${args.stepOrder} (${args.role}).`,
        metadata: {
          contractId: args.contractId,
          contractNo: args.contractNo,
          alertKind: 'approvalTurn',
          approvalStepOrder: args.stepOrder,
          approvalRole: args.role,
          href: '/hr/contracts',
        },
      },
    });

    return { notified: true, recipients: recipientUserIds.length };
  }

  async runNotificationsScan(hotelId: string, force = false) {
    const today = dayjs().format('YYYY-MM-DD');
    const settings = await this.getContractSettings(hotelId);
    const warningDays = settings.contractExpiryWarningDays;
    const notificationSettings = settings.hrContractSettings.notifications;
    const staleApprovalDays = notificationSettings.staleApprovalReminderDays;
    const staleSignatureDays = notificationSettings.staleSignatureReminderDays;
    const digestRecipientUserIds =
      (await this.resolveDigestRecipientUserIds(
        hotelId,
        notificationSettings.digestRecipientRoles,
      )) ?? undefined;

    const expiringContracts = await this.prisma.hrContract.findMany({
      where: {
        hotelId,
        status: { in: ['ACTIVE', 'APPROVED'] },
        endDate: {
          gte: dayjs().startOf('day').toDate(),
          lte: dayjs().add(warningDays, 'day').endOf('day').toDate(),
        },
      },
      select: {
        id: true,
        contractNo: true,
        staffNameSnapshot: true,
        departmentSnapshot: true,
        positionSnapshot: true,
        endDate: true,
      },
      orderBy: { endDate: 'asc' },
    });

    const staleApprovals = await this.prisma.hrContract.findMany({
      where: {
        hotelId,
        status: 'PENDING_APPROVAL',
        submittedAt: {
          lte: dayjs().subtract(staleApprovalDays, 'day').endOf('day').toDate(),
        },
      },
      include: {
        approvals: {
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { submittedAt: 'asc' },
    } as any);

    const staleSignatures = await this.prisma.hrContract.findMany({
      where: {
        hotelId,
        status: 'AWAITING_SIGNATURE',
        approvedAt: {
          lte: dayjs().subtract(staleSignatureDays, 'day').endOf('day').toDate(),
        },
      },
      select: {
        contractNo: true,
        staffNameSnapshot: true,
        approvedAt: true,
      },
      orderBy: { approvedAt: 'asc' },
    });

    let expiryDispatched = false;
    let staleApprovalDispatched = false;
    let staleSignatureDispatched = false;

    if (
      notificationSettings.expiryDigestEnabled &&
      expiringContracts.length &&
      (force ||
        !(await this.hasExistingContractNotification({
          hotelId,
          event: 'hrContractExpiry',
          alertKind: 'expiryDigest',
          alertDate: today,
        })))
    ) {
      try {
        await this.notifications.dispatch({
          hotelId,
          event: 'hrContractExpiry',
          recipientUserIds: digestRecipientUserIds,
          email: this.buildExpiryDigestEmail({
            hotelName: settings.hotelName,
            warningDays,
            contracts: expiringContracts as any,
          }),
          inApp: {
            title: 'Contracts nearing expiry',
            message: `${expiringContracts.length} contract(s) are expiring within ${warningDays} days.`,
            metadata: {
              alertKind: 'expiryDigest',
              alertDate: today,
              contractCount: expiringContracts.length,
              href: '/hr/contracts',
            },
          },
        });
        expiryDispatched = true;
      } catch (error) {
        this.logger.warn(`Failed to dispatch hrContractExpiry digest: ${String(error)}`);
      }
    }

    if (
      notificationSettings.staleApprovalDigestEnabled &&
      staleApprovals.length &&
      (force ||
        !(await this.hasExistingContractNotification({
          hotelId,
          event: 'hrContractApproval',
          alertKind: 'staleApprovalDigest',
          alertDate: today,
        })))
    ) {
      try {
        await this.notifications.dispatch({
          hotelId,
          event: 'hrContractApproval',
          recipientUserIds: digestRecipientUserIds,
          email: this.buildStaleApprovalEmail({
            hotelName: settings.hotelName,
            staleDays: staleApprovalDays,
            contracts: staleApprovals.map((contract: any) => ({
              contractNo: contract.contractNo,
              staffNameSnapshot: contract.staffNameSnapshot,
              submittedAt: contract.submittedAt,
              pendingRole:
                contract.approvals?.find((approval: any) => approval.status === 'PENDING')?.role ??
                null,
            })),
          }),
          inApp: {
            title: 'Contracts pending approval too long',
            message: `${staleApprovals.length} contract(s) have been waiting on approval for at least ${staleApprovalDays} days.`,
            metadata: {
              alertKind: 'staleApprovalDigest',
              alertDate: today,
              contractCount: staleApprovals.length,
              href: '/hr/contracts',
            },
          },
        });
        staleApprovalDispatched = true;
      } catch (error) {
        this.logger.warn(`Failed to dispatch hrContractApproval stale digest: ${String(error)}`);
      }
    }

    if (
      notificationSettings.staleSignatureDigestEnabled &&
      staleSignatures.length &&
      (force ||
        !(await this.hasExistingContractNotification({
          hotelId,
          event: 'hrContractApproval',
          alertKind: 'staleSignatureDigest',
          alertDate: today,
        })))
    ) {
      try {
        await this.notifications.dispatch({
          hotelId,
          event: 'hrContractApproval',
          recipientUserIds: digestRecipientUserIds,
          email: {
            subject: 'Contracts awaiting signature too long',
            text:
              `${settings.hotelName}: ${staleSignatures.length} contract(s) have been awaiting signature for at least ${staleSignatureDays} days.\n` +
              staleSignatures
                .map(
                  (contract: any) =>
                    `- ${contract.contractNo}: ${contract.staffNameSnapshot} · approved ${dayjs(contract.approvedAt).format('YYYY-MM-DD')}`,
                )
                .join('\n'),
            html: `<div><p>${escapeHtml(settings.hotelName)} has <strong>${staleSignatures.length}</strong> contract(s) awaiting signature for at least <strong>${staleSignatureDays}</strong> days.</p></div>`,
          },
          inApp: {
            title: 'Contracts awaiting signature too long',
            message: `${staleSignatures.length} contract(s) have been waiting on signatures for at least ${staleSignatureDays} days.`,
            metadata: {
              alertKind: 'staleSignatureDigest',
              alertDate: today,
              contractCount: staleSignatures.length,
              href: '/hr/contracts',
            },
          },
        });
        staleSignatureDispatched = true;
      } catch (error) {
        this.logger.warn(
          `Failed to dispatch hrContractApproval stale signature digest: ${String(error)}`,
        );
      }
    }

    return {
      hotelId,
      warningDays,
      expiringContracts: expiringContracts.length,
      staleApprovals: staleApprovals.length,
      staleSignatures: staleSignatures.length,
      expiryDispatched,
      staleApprovalDispatched,
      staleSignatureDispatched,
    };
  }

  private deriveStatus(
    contract: {
      status: string;
      startDate: Date;
      endDate: Date | null;
    },
    expiryWarningDays = EXPIRY_WARNING_DAYS,
  ) {
    const raw = this.normalizeStatus(contract.status);
    if (raw === 'DRAFT') return 'DRAFT';
    if (raw === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
    if (raw === 'AWAITING_SIGNATURE') return 'AWAITING_SIGNATURE';
    if (raw === 'REJECTED') return 'REJECTED';
    if (raw === 'TERMINATED') return 'TERMINATED';
    if (raw === 'SUPERSEDED') return 'SUPERSEDED';
    if (raw === 'APPROVED' && dayjs(contract.startDate).startOf('day').isAfter(dayjs().startOf('day'))) {
      return 'APPROVED';
    }

    if (contract.endDate) {
      const today = dayjs().startOf('day');
      const endDate = dayjs(contract.endDate).endOf('day');
      if (endDate.isBefore(today)) return 'EXPIRED';
      if (endDate.diff(today, 'day') <= expiryWarningDays) return 'EXPIRING_SOON';
    }

    return ACTIVE_BASE_STATUSES.has(raw) ? 'ACTIVE' : raw;
  }

  private isLiveContractStatus(derivedStatus: string) {
    return derivedStatus === 'ACTIVE' || derivedStatus === 'EXPIRING_SOON';
  }

  private async generateContractNo(prefix = 'CTR') {
    const base = `${prefix}-${dayjs().format('YYYYMMDD')}`;
    let contractNo = base;
    let attempt = 1;

    while (await this.prisma.hrContract.findUnique({ where: { contractNo } })) {
      attempt += 1;
      contractNo = `${base}-${String(attempt).padStart(2, '0')}`;
      if (attempt > 50) {
        throw new ConflictException('Could not generate a unique contract number.');
      }
    }

    return contractNo;
  }

  private async ensureStaff(hotelId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: true,
        position: true,
      },
    });

    if (!staff) throw new NotFoundException('Staff member not found.');
    return staff;
  }

  private async ensureDepartment(hotelId: string, departmentId?: string | null) {
    if (!departmentId) return null;
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, hotelId },
      select: { id: true, name: true },
    });
    if (!department) throw new NotFoundException('Department not found.');
    return department;
  }

  async list(hotelId: string, query: {
    search?: string;
    status?: string;
    type?: string;
    departmentId?: string;
    staffId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (query.type) where.type = this.normalizeType(query.type);
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.staffId) where.staffId = query.staffId;
    if (query.search) {
      where.OR = [
        { contractNo: { contains: query.search, mode: 'insensitive' } },
        { staffNameSnapshot: { contains: query.search, mode: 'insensitive' } },
        { departmentSnapshot: { contains: query.search, mode: 'insensitive' } },
        { positionSnapshot: { contains: query.search, mode: 'insensitive' } },
        { employeeCodeSnapshot: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total, settings] = await Promise.all([
      this.prisma.hrContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          staff: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
          department: { select: { id: true, name: true } },
          compensationHistory: {
            orderBy: { effectiveFrom: 'desc' },
            take: 1,
          },
          ...(query.staffId
            ? {
                documents: {
                  orderBy: { uploadedAt: 'desc' },
                },
              }
            : {}),
        },
      }),
      this.prisma.hrContract.count({ where }),
      this.getContractSettings(hotelId),
    ]);

    const mapped = (rows as any[]).map((row) => {
      const derivedStatus = this.deriveStatus(row, settings.contractExpiryWarningDays);
      return {
        id: row.id,
        contractNo: row.contractNo,
        type: row.type,
        status: row.status,
        derivedStatus,
        startDate: row.startDate,
        endDate: row.endDate,
        salary: Number(row.salary),
        currency: row.currency,
        positionTitle: row.positionTitle,
        staffNameSnapshot: row.staffNameSnapshot,
        employeeCodeSnapshot: row.employeeCodeSnapshot,
        departmentSnapshot: row.departmentSnapshot,
        notes: row.notes,
        renewedFromContractId: row.renewedFromContractId,
        submittedAt: row.submittedAt,
        submittedByUserId: row.submittedByUserId,
        approvedAt: row.approvedAt,
        approvedByUserId: row.approvedByUserId,
        approvalComment: row.approvalComment,
        signedAt: row.signedAt,
        signedByUserId: row.signedByUserId,
        activatedAt: row.activatedAt,
        rejectedAt: row.rejectedAt,
        rejectedByUserId: row.rejectedByUserId,
        rejectionReason: row.rejectionReason,
        probationEndDate: row.probationEndDate,
        terminationDate: row.terminationDate,
        terminationReason: row.terminationReason,
        terminatedByUserId: row.terminatedByUserId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        staff: row.staff,
        department: row.department,
        latestCompensation: row.compensationHistory[0]
          ? {
              amount: Number(row.compensationHistory[0].amount),
              currency: row.compensationHistory[0].currency,
              effectiveFrom: row.compensationHistory[0].effectiveFrom,
              effectiveTo: row.compensationHistory[0].effectiveTo,
            }
          : null,
        documents: Array.isArray(row.documents)
          ? row.documents.map((document: any) => ({
              id: document.id,
              documentType: document.documentType,
              source: document.source,
              fileName: document.fileName,
              fileUrl: document.fileUrl,
              storageKey: document.storageKey,
              mimeType: document.mimeType,
              fileSizeBytes: document.fileSizeBytes,
              uploadedByUserId: document.uploadedByUserId,
              uploadedAt: document.uploadedAt,
            }))
          : undefined,
      };
    });

    const normalizedStatus = query.status?.toUpperCase();
    const filtered =
      normalizedStatus && normalizedStatus !== 'ALL'
        ? mapped.filter((row) => row.derivedStatus === normalizedStatus)
        : mapped;

    const stats = {
      active: mapped.filter((row) => row.derivedStatus === 'ACTIVE').length,
      expiringSoon: mapped.filter((row) => row.derivedStatus === 'EXPIRING_SOON').length,
      expired: mapped.filter((row) => row.derivedStatus === 'EXPIRED').length,
      draft: mapped.filter((row) => row.derivedStatus === 'DRAFT').length,
    };

    return {
      contracts: filtered,
      total: normalizedStatus && normalizedStatus !== 'ALL' ? filtered.length : total,
      page,
      limit,
      totalPages: Math.ceil(((normalizedStatus && normalizedStatus !== 'ALL') ? filtered.length : total) / limit),
      stats,
      settings: {
        contractExpiryWarningDays: settings.contractExpiryWarningDays,
      },
    };
  }

  async getOne(hotelId: string, id: string) {
    const [contract, settings] = await Promise.all([
      this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            position: true,
          },
        },
        department: { select: { id: true, name: true } },
        renewedFromContract: {
          select: { id: true, contractNo: true },
        },
        renewedContracts: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, contractNo: true, status: true, startDate: true },
        },
        approvals: {
          orderBy: { stepOrder: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
        compensationHistory: { orderBy: { effectiveFrom: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      } as any,
      }),
      this.getContractSettings(hotelId),
    ]);

    if (!contract) throw new NotFoundException('Contract not found.');

    const typedContract = contract as any;

    return {
      ...typedContract,
      salary: Number(typedContract.salary),
      derivedStatus: this.deriveStatus(typedContract, settings.contractExpiryWarningDays),
      compensationHistory: typedContract.compensationHistory.map((item: any) => ({
        ...item,
        amount: Number(item.amount),
      })),
      documents: typedContract.documents.map((document: any) => ({
        ...document,
      })),
      approvals: (typedContract.approvals || []).map((approval: any) => ({
        ...approval,
      })),
      auditLogs: (typedContract.auditLogs || []).map((log: any) => ({
        ...log,
      })),
    };
  }

  async getOverview(hotelId: string) {
    const settings = await this.getContractSettings(hotelId);
    const warningDays = settings.contractExpiryWarningDays;
    const approvalBacklogDays =
      settings.hrContractSettings.notifications.staleApprovalReminderDays;
    const signatureBacklogDays =
      settings.hrContractSettings.notifications.staleSignatureReminderDays;
    const today = dayjs().startOf('day');
    const months = Array.from({ length: 6 }, (_, index) => today.subtract(5 - index, 'month'));
    const monthMap = new Map(
      months.map((month) => [
        month.format('YYYY-MM'),
        {
          month: month.format('YYYY-MM'),
          label: month.format('MMM YYYY'),
          totalAmount: 0,
          changeCount: 0,
        },
      ]),
    );

    const [staffRows, contractRows, compensationRows, auditRows] = await Promise.all([
      this.prisma.staff.findMany({
        where: { hotelId },
        select: {
          id: true,
          department: true,
        },
      }),
      this.prisma.hrContract.findMany({
        where: { hotelId },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          contractNo: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          salary: true,
          currency: true,
          staffNameSnapshot: true,
          departmentSnapshot: true,
          positionSnapshot: true,
          renewedFromContractId: true,
          submittedAt: true,
          approvedAt: true,
          rejectionReason: true,
          terminationDate: true,
          createdAt: true,
        approvals: {
          where: { status: 'PENDING' },
          orderBy: { stepOrder: 'asc' },
          take: 1,
          select: {
              stepOrder: true,
              role: true,
              createdAt: true,
            },
          },
          documents: {
            select: {
              documentType: true,
            },
          },
        } as any,
      }),
      this.prisma.staffCompensationHistory.findMany({
        where: {
          hotelId,
          effectiveFrom: {
            gte: months[0].startOf('month').toDate(),
          },
        },
        select: {
          amount: true,
          effectiveFrom: true,
        },
        orderBy: { effectiveFrom: 'asc' },
      }),
      (this.prisma as any).hrContractAuditLog.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              staffNameSnapshot: true,
            },
          },
        },
      }),
    ]);

    const staffByDepartment = new Map<string, { department: string; staffCount: number }>();
    for (const staff of staffRows) {
      const departmentName = (staff.department || 'Unassigned').trim() || 'Unassigned';
      const existing = staffByDepartment.get(departmentName) || {
        department: departmentName,
        staffCount: 0,
      };
      existing.staffCount += 1;
      staffByDepartment.set(departmentName, existing);
    }

    const departmentSummaryMap = new Map<
      string,
      {
        department: string;
        staffCount: number;
        activeContracts: number;
        monthlyCommitment: number;
      }
    >();

    for (const entry of staffByDepartment.values()) {
      departmentSummaryMap.set(entry.department, {
        department: entry.department,
        staffCount: entry.staffCount,
        activeContracts: 0,
        monthlyCommitment: 0,
      });
    }

    const statusDistributionMap = new Map<string, number>();
    const typeDistributionMap = new Map<string, { type: string; count: number; monthlyCommitment: number }>();
    const approvalPerformanceMap = new Map<
      string,
      {
        role: string;
        openCount: number;
        backlogCount: number;
        totalPendingDays: number;
        completedStepsLast30Days: number;
      }
    >();
    const departmentHealthMap = new Map<
      string,
      {
        department: string;
        liveContracts: number;
        expiringSoon: number;
        pendingApprovals: number;
        awaitingSignature: number;
        terminationsLast90Days: number;
      }
    >();
    const complianceContracts: Array<{
      id: string;
      contractNo: string;
      staffNameSnapshot: string;
      departmentSnapshot: string;
      derivedStatus: string;
      missingDocumentLabels: string[];
    }> = [];

    const contracts = (contractRows as any[]).map((row) => {
      const derivedStatus = this.deriveStatus(row, warningDays);
      const salary = Number(row.salary);
      const endDate = row.endDate ? dayjs(row.endDate).endOf('day') : null;
      const pendingStep = row.approvals?.[0] || null;
      const daysToExpiry = endDate ? endDate.diff(today, 'day') : null;
      const pendingDays =
        derivedStatus === 'AWAITING_SIGNATURE'
          ? row.approvedAt
            ? today.diff(dayjs(row.approvedAt).startOf('day'), 'day')
            : null
          : row.submittedAt
            ? today.diff(dayjs(row.submittedAt).startOf('day'), 'day')
            : null;
      const availableDocumentTypes = new Set<string>(
        ((row.documents || []) as any[]).map((document: any) => String(document.documentType)),
      );
      const complianceStage =
        derivedStatus === 'AWAITING_SIGNATURE' ||
        derivedStatus === 'ACTIVE' ||
        derivedStatus === 'EXPIRING_SOON' ||
        derivedStatus === 'EXPIRED' ||
        derivedStatus === 'APPROVED'
          ? 'sign'
          : 'submit';
      const { missingLabels: missingDocumentLabels } = this.getMissingRequiredDocuments({
        availableDocumentTypes,
        settings: settings.hrContractSettings,
        stage: complianceStage,
      });

      statusDistributionMap.set(derivedStatus, (statusDistributionMap.get(derivedStatus) || 0) + 1);

      const normalizedType = this.normalizeType(row.type);
      const existingType = typeDistributionMap.get(normalizedType) || {
        type: normalizedType,
        count: 0,
        monthlyCommitment: 0,
      };
      existingType.count += 1;
      if (this.isLiveContractStatus(derivedStatus)) {
        existingType.monthlyCommitment += salary;
      }
      typeDistributionMap.set(normalizedType, existingType);

      const departmentName = (row.departmentSnapshot || 'Unassigned').trim() || 'Unassigned';
      const departmentEntry = departmentSummaryMap.get(departmentName) || {
        department: departmentName,
        staffCount: 0,
        activeContracts: 0,
        monthlyCommitment: 0,
      };
      const departmentHealthEntry = departmentHealthMap.get(departmentName) || {
        department: departmentName,
        liveContracts: 0,
        expiringSoon: 0,
        pendingApprovals: 0,
        awaitingSignature: 0,
        terminationsLast90Days: 0,
      };
      if (this.isLiveContractStatus(derivedStatus)) {
        departmentEntry.activeContracts += 1;
        departmentEntry.monthlyCommitment += salary;
        departmentHealthEntry.liveContracts += 1;
      }
      if (derivedStatus === 'EXPIRING_SOON') {
        departmentHealthEntry.expiringSoon += 1;
      }
      if (derivedStatus === 'PENDING_APPROVAL') {
        departmentHealthEntry.pendingApprovals += 1;
      }
      if (derivedStatus === 'AWAITING_SIGNATURE') {
        departmentHealthEntry.awaitingSignature += 1;
      }
      if (row.terminationDate && dayjs(row.terminationDate).isAfter(today.subtract(90, 'day'))) {
        departmentHealthEntry.terminationsLast90Days += 1;
      }
      departmentSummaryMap.set(departmentName, departmentEntry);
      departmentHealthMap.set(departmentName, departmentHealthEntry);

      if (
        pendingStep?.role &&
        (derivedStatus === 'PENDING_APPROVAL' || derivedStatus === 'AWAITING_SIGNATURE')
      ) {
        const approvalRole =
          derivedStatus === 'AWAITING_SIGNATURE' ? 'SIGNATURE' : this.normalizeRole(pendingStep.role);
        const approvalEntry = approvalPerformanceMap.get(approvalRole) || {
          role: approvalRole,
          openCount: 0,
          backlogCount: 0,
          totalPendingDays: 0,
          completedStepsLast30Days: 0,
        };
        approvalEntry.openCount += 1;
        approvalEntry.totalPendingDays += pendingDays ?? 0;
        if ((pendingDays ?? 0) >= approvalBacklogDays) {
          approvalEntry.backlogCount += 1;
        }
        approvalPerformanceMap.set(approvalRole, approvalEntry);
      }

      if (derivedStatus === 'AWAITING_SIGNATURE') {
        const signatureEntry = approvalPerformanceMap.get('SIGNATURE') || {
          role: 'SIGNATURE',
          openCount: 0,
          backlogCount: 0,
          totalPendingDays: 0,
          completedStepsLast30Days: 0,
        };
        signatureEntry.openCount += 1;
        signatureEntry.totalPendingDays += pendingDays ?? 0;
        if ((pendingDays ?? 0) >= signatureBacklogDays) {
          signatureEntry.backlogCount += 1;
        }
        approvalPerformanceMap.set('SIGNATURE', signatureEntry);
      }

      if (
        missingDocumentLabels.length &&
        ['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'AWAITING_SIGNATURE', 'ACTIVE', 'EXPIRING_SOON'].includes(
          derivedStatus,
        )
      ) {
        complianceContracts.push({
          id: row.id,
          contractNo: row.contractNo,
          staffNameSnapshot: row.staffNameSnapshot,
          departmentSnapshot: departmentName,
          derivedStatus,
          missingDocumentLabels,
        });
      }

      return {
        id: row.id,
        contractNo: row.contractNo,
        type: normalizedType,
        derivedStatus,
        staffNameSnapshot: row.staffNameSnapshot,
        departmentSnapshot: departmentName,
        positionSnapshot: row.positionSnapshot,
        salary,
        currency: row.currency,
        startDate: row.startDate,
        endDate: row.endDate,
        submittedAt: row.submittedAt,
        approvedAt: row.approvedAt,
        rejectionReason: row.rejectionReason,
        renewedFromContractId: row.renewedFromContractId,
        terminationDate: row.terminationDate,
        createdAt: row.createdAt,
        pendingStep,
        daysToExpiry,
        pendingDays,
        missingDocumentLabels,
      };
    });

    for (const row of auditRows as any[]) {
      if (
        row.action === 'APPROVED_STEP' &&
        dayjs(row.createdAt).isAfter(today.subtract(30, 'day'))
      ) {
        const approvalRole = this.normalizeRole(String((row.metadata as any)?.role || 'APPROVAL'));
        const entry = approvalPerformanceMap.get(approvalRole) || {
          role: approvalRole,
          openCount: 0,
          backlogCount: 0,
          totalPendingDays: 0,
          completedStepsLast30Days: 0,
        };
        entry.completedStepsLast30Days += 1;
        approvalPerformanceMap.set(approvalRole, entry);
      }
    }

    for (const row of compensationRows) {
      const key = dayjs(row.effectiveFrom).format('YYYY-MM');
      const bucket = monthMap.get(key);
      if (!bucket) continue;
      bucket.totalAmount += Number(row.amount);
      bucket.changeCount += 1;
    }

    const liveContracts = contracts.filter((contract) => this.isLiveContractStatus(contract.derivedStatus));
    const expiringSoonContracts = contracts
      .filter((contract) => contract.derivedStatus === 'EXPIRING_SOON')
      .sort((left, right) => (left.daysToExpiry ?? 9999) - (right.daysToExpiry ?? 9999));
    const pendingApprovals = contracts
      .filter(
        (contract) =>
          contract.derivedStatus === 'PENDING_APPROVAL' ||
          contract.derivedStatus === 'AWAITING_SIGNATURE',
      )
      .sort((left, right) => (right.pendingDays ?? 0) - (left.pendingDays ?? 0));
    const terminatedLast30Days = contracts.filter(
      (contract) =>
        contract.terminationDate &&
        dayjs(contract.terminationDate).isAfter(today.subtract(30, 'day')),
    ).length;
    const renewalsLast90Days = contracts.filter(
      (contract) =>
        contract.renewedFromContractId &&
        dayjs(contract.createdAt).isAfter(today.subtract(90, 'day')),
    ).length;
    const approvalBacklogOver3Days = pendingApprovals.filter(
      (contract) => (contract.pendingDays ?? 0) >= STALE_APPROVAL_DAYS,
    ).length;

    const maxDepartmentStaff = Math.max(
      1,
      ...Array.from(departmentSummaryMap.values()).map((entry) => entry.staffCount),
    );
    const maxDepartmentCommitment = Math.max(
      1,
      ...Array.from(departmentSummaryMap.values()).map((entry) => entry.monthlyCommitment),
    );
    const maxStatusCount = Math.max(1, ...Array.from(statusDistributionMap.values()));
    const maxTypeCount = Math.max(
      1,
      ...Array.from(typeDistributionMap.values()).map((entry) => entry.count),
    );
    const maxTrendAmount = Math.max(1, ...Array.from(monthMap.values()).map((entry) => entry.totalAmount));

    return {
      generatedAt: new Date().toISOString(),
      settings: {
        contractExpiryWarningDays: warningDays,
      },
      summary: {
        totalStaff: staffRows.length,
        activeContracts: liveContracts.length,
        pendingApprovals: pendingApprovals.length,
        monthlyCommitment: liveContracts.reduce((sum, contract) => sum + contract.salary, 0),
        expiringSoon: expiringSoonContracts.length,
        terminatedLast30Days,
        renewalsLast90Days,
        approvalBacklogOver3Days,
        contractCoveragePct: staffRows.length
          ? Math.round((liveContracts.length / staffRows.length) * 100)
          : 0,
      },
      headcountByDepartment: Array.from(departmentSummaryMap.values())
        .sort(
          (left, right) =>
            right.activeContracts - left.activeContracts ||
            right.staffCount - left.staffCount ||
            left.department.localeCompare(right.department),
        )
        .slice(0, 8)
        .map((entry) => ({
          ...entry,
          staffSharePct: Math.round((entry.staffCount / maxDepartmentStaff) * 100),
          commitmentSharePct: Math.round((entry.monthlyCommitment / maxDepartmentCommitment) * 100),
        })),
      contractStatusDistribution: Array.from(statusDistributionMap.entries())
        .map(([status, count]) => ({
          status,
          label: this.humanizeValue(status),
          count,
          sharePct: Math.round((count / maxStatusCount) * 100),
        }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
      contractTypeDistribution: Array.from(typeDistributionMap.values())
        .map((entry) => ({
          ...entry,
          label: this.humanizeValue(entry.type),
          sharePct: Math.round((entry.count / maxTypeCount) * 100),
        }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
      compensationTrend: Array.from(monthMap.values()).map((entry) => ({
        ...entry,
        barPct: Math.round((entry.totalAmount / maxTrendAmount) * 100),
      })),
      expiringContracts: expiringSoonContracts.slice(0, 6).map((contract) => ({
        id: contract.id,
        contractNo: contract.contractNo,
        staffNameSnapshot: contract.staffNameSnapshot,
        departmentSnapshot: contract.departmentSnapshot,
        positionSnapshot: contract.positionSnapshot,
        endDate: contract.endDate,
        daysToExpiry: contract.daysToExpiry,
      })),
      approvalQueue: pendingApprovals.slice(0, 6).map((contract) => ({
        id: contract.id,
        contractNo: contract.contractNo,
        staffNameSnapshot: contract.staffNameSnapshot,
        departmentSnapshot: contract.departmentSnapshot,
        submittedAt:
          contract.derivedStatus === 'AWAITING_SIGNATURE'
            ? contract.approvedAt
            : contract.submittedAt,
        pendingDays: contract.pendingDays,
        pendingRole:
          contract.derivedStatus === 'AWAITING_SIGNATURE'
            ? 'SIGNATURE'
            : contract.pendingStep?.role ?? null,
        pendingStepOrder:
          contract.derivedStatus === 'AWAITING_SIGNATURE'
            ? null
            : contract.pendingStep?.stepOrder ?? null,
        rejectionReason: contract.rejectionReason,
      })),
      approvalPerformance: Array.from(approvalPerformanceMap.values())
        .map((entry) => ({
          role: entry.role,
          label: this.humanizeValue(entry.role),
          openCount: entry.openCount,
          backlogCount: entry.backlogCount,
          completedStepsLast30Days: entry.completedStepsLast30Days,
          averagePendingDays: entry.openCount
            ? Number((entry.totalPendingDays / entry.openCount).toFixed(1))
            : 0,
        }))
        .sort(
          (left, right) =>
            right.backlogCount - left.backlogCount ||
            right.openCount - left.openCount ||
            left.label.localeCompare(right.label),
        ),
      departmentContractHealth: Array.from(departmentHealthMap.values())
        .sort(
          (left, right) =>
            right.expiringSoon - left.expiringSoon ||
            right.pendingApprovals - left.pendingApprovals ||
            right.awaitingSignature - left.awaitingSignature ||
            left.department.localeCompare(right.department),
        )
        .slice(0, 8),
      documentCompliance: {
        fullyCompliantLiveContracts: liveContracts.filter(
          (contract) => !contract.missingDocumentLabels.length,
        ).length,
        contractsMissingGeneratedPdf: complianceContracts.filter((contract) =>
          contract.missingDocumentLabels.includes('Generated contract PDF'),
        ).length,
        contractsMissingSignedCopy: complianceContracts.filter((contract) =>
          contract.missingDocumentLabels.includes('Signed Contract'),
        ).length,
        contractsWithMissingRequiredDocs: complianceContracts.length,
        flaggedContracts: complianceContracts.slice(0, 6),
      },
      recentActivity: (auditRows as any[]).map((row) => ({
        id: row.id,
        contractId: row.contractId,
        contractNo: row.contract?.contractNo ?? null,
        staffNameSnapshot: row.contract?.staffNameSnapshot ?? null,
        action: row.action,
        actionLabel: this.humanizeValue(row.action),
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        createdAt: row.createdAt,
      })),
    };
  }

  async listAuditLogs(
    hotelId: string,
    query: {
      search?: string;
      action?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.HrContractAuditLogWhereInput = { hotelId };

    if (query.action && query.action.toUpperCase() !== 'ALL') {
      where.action = query.action.trim().toUpperCase();
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { fromStatus: { contains: search, mode: 'insensitive' } },
        { toStatus: { contains: search, mode: 'insensitive' } },
        {
          contract: {
            is: {
              contractNo: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          contract: {
            is: {
              staffNameSnapshot: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          contract: {
            is: {
              departmentSnapshot: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [rows, total, allRows] = await Promise.all([
      (this.prisma as any).hrContractAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              staffNameSnapshot: true,
              departmentSnapshot: true,
              positionSnapshot: true,
              type: true,
              status: true,
            },
          },
        },
      }),
      (this.prisma as any).hrContractAuditLog.count({ where }),
      (this.prisma as any).hrContractAuditLog.findMany({
        where: { hotelId },
        select: { action: true, fromStatus: true, toStatus: true },
      }),
    ]);

    const actionSet = new Set<string>();
    const statusSet = new Set<string>();
    for (const row of allRows as any[]) {
      if (row.action) actionSet.add(row.action);
      if (row.fromStatus) statusSet.add(row.fromStatus);
      if (row.toStatus) statusSet.add(row.toStatus);
    }

    return {
      logs: (rows as any[]).map((row) => ({
        id: row.id,
        contractId: row.contractId,
        actorUserId: row.actorUserId,
        action: row.action,
        actionLabel: this.humanizeValue(row.action),
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        metadata: row.metadata || null,
        createdAt: row.createdAt,
        contract: row.contract
          ? {
              id: row.contract.id,
              contractNo: row.contract.contractNo,
              staffNameSnapshot: row.contract.staffNameSnapshot,
              departmentSnapshot: row.contract.departmentSnapshot,
              positionSnapshot: row.contract.positionSnapshot,
              type: row.contract.type,
              status: row.contract.status,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        actions: Array.from(actionSet).sort(),
        statuses: Array.from(statusSet).sort(),
      },
    };
  }

  async listApprovalRoutes(hotelId: string) {
    const routes = await (this.prisma as any).hrContractApprovalRoute.findMany({
      where: { hotelId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: [{ isDefault: 'desc' }, { contractType: 'asc' }, { createdAt: 'desc' }],
    } as any);

    return {
      routes,
      fallback: this.fallbackApprovalRoute('CONTRACT'),
    };
  }

  async createApprovalRoute(
    hotelId: string,
    dto: {
      name: string;
      contractType?: string;
      isDefault?: boolean;
      isActive?: boolean;
      steps: Array<{ stepOrder: number; role: string; required?: boolean; userId?: string }>;
    },
  ) {
    this.validateApprovalSteps(dto.steps);

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await (tx as any).hrContractApprovalRoute.updateMany({
          where: { hotelId, isDefault: true },
          data: { isDefault: false },
        } as any);
      }

      return (tx as any).hrContractApprovalRoute.create({
        data: {
          hotelId,
          name: dto.name.trim(),
          contractType: dto.contractType ? this.normalizeType(dto.contractType) : null,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          steps: {
            create: dto.steps
              .map((step) => ({
                stepOrder: step.stepOrder,
                role: this.normalizeRole(step.role),
                required: step.required ?? true,
                userId: step.userId?.trim() || null,
              }))
              .sort((left, right) => left.stepOrder - right.stepOrder),
          },
        } as any,
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
        },
      } as any);
    });

    return created;
  }

  async updateApprovalRoute(
    hotelId: string,
    id: string,
    dto: {
      name: string;
      contractType?: string;
      isDefault?: boolean;
      isActive?: boolean;
      steps: Array<{ stepOrder: number; role: string; required?: boolean; userId?: string }>;
    },
  ) {
    this.validateApprovalSteps(dto.steps);

    const existing = await (this.prisma as any).hrContractApprovalRoute.findFirst({
      where: { id, hotelId },
      select: { id: true },
    } as any);
    if (!existing) throw new NotFoundException('Approval route not found.');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await (tx as any).hrContractApprovalRoute.updateMany({
          where: { hotelId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        } as any);
      }

      await (tx as any).hrContractApprovalRouteStep.deleteMany({
        where: { routeId: id },
      } as any);

      return (tx as any).hrContractApprovalRoute.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          contractType: dto.contractType ? this.normalizeType(dto.contractType) : null,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          steps: {
            create: dto.steps
              .map((step) => ({
                stepOrder: step.stepOrder,
                role: this.normalizeRole(step.role),
                required: step.required ?? true,
                userId: step.userId?.trim() || null,
              }))
              .sort((left, right) => left.stepOrder - right.stepOrder),
          },
        } as any,
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
        },
      } as any);
    });

    return updated;
  }

  async create(
    hotelId: string,
    actorUserId: string | null,
    dto: {
      staffId: string;
      departmentId?: string;
      positionTitle?: string;
      type: string;
      startDate: string;
      endDate?: string;
      salary: number;
      currency?: string;
      probationEndDate?: string;
      reportingManagerStaffId?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const salary = Number(dto.salary ?? 0);
    if (salary < 0) throw new BadRequestException('Salary must be zero or greater.');

    const staff = await this.ensureStaff(hotelId, dto.staffId);
    const department = await this.ensureDepartment(hotelId, dto.departmentId);
    const settings = await this.getContractSettings(hotelId);
    const contractNo = await this.generateContractNo(
      settings.hrContractSettings.numbering.contractNumberPrefix,
    );
    const contractType = this.normalizeType(dto.type);
    const status = this.normalizeStatus(dto.status || 'DRAFT');
    if (status === 'ACTIVE') {
      this.assertDirectActivationAllowed({
        settings: settings.hrContractSettings,
        source: 'create',
      });
    }
    const staffNameSnapshot = `${staff.firstName} ${staff.lastName}`.trim();
    const departmentSnapshot = department?.name || staff.department;
    const positionSnapshot = dto.positionTitle?.trim() || staff.position;

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hrContract.create({
        data: {
          hotelId,
          staffId: staff.id,
          departmentId: department?.id || null,
          positionTitle: positionSnapshot,
          staffNameSnapshot,
          employeeCodeSnapshot: staff.employeeCode,
          departmentSnapshot,
          positionSnapshot,
          contractNo,
          type: contractType,
          status,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          salary,
          currency: dto.currency?.trim() || 'NGN',
          probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
          reportingManagerStaffId: dto.reportingManagerStaffId || null,
          notes: dto.notes?.trim() || null,
          activatedAt: status === 'ACTIVE' ? new Date() : null,
        },
      });

      await tx.staffCompensationHistory.create({
        data: {
          hotelId,
          staffId: staff.id,
          contractId: created.id,
          amount: salary,
          currency: dto.currency?.trim() || 'NGN',
          effectiveFrom: new Date(dto.startDate),
          reason: 'CONTRACT_CREATED',
          createdByUserId: actorUserId || null,
        },
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: created.id,
        actorUserId,
        action: 'CREATED',
        toStatus: status,
        metadata: {
          contractNo,
          type: contractType,
          salary,
          currency: dto.currency?.trim() || 'NGN',
        },
      });

      return created;
    });

    return this.getOne(hotelId, contract.id);
  }

  async update(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    dto: {
      departmentId?: string;
      positionTitle?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      salary?: number;
      currency?: string;
      probationEndDate?: string;
      reportingManagerStaffId?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: { staff: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Contract not found.');

    if (!this.canEditContract(existing.status)) {
      throw new BadRequestException(
        'Only draft or rejected contracts can be edited. Use the dedicated workflow actions for contracts already in approval, awaiting signature, active, terminated, or superseded states.',
      );
    }

    const department = dto.departmentId !== undefined
      ? await this.ensureDepartment(hotelId, dto.departmentId)
      : undefined;

    const salary = dto.salary !== undefined ? Number(dto.salary) : undefined;
    if (salary !== undefined && salary < 0) {
      throw new BadRequestException('Salary must be zero or greater.');
    }

    const nextStatus = dto.status ? this.normalizeStatus(dto.status) : undefined;
    if (nextStatus && nextStatus !== this.normalizeStatus(existing.status)) {
      throw new BadRequestException(
        'Contract status cannot be changed from edit. Use the dedicated submit, approve, sign, terminate, or renew actions instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.hrContract.update({
        where: { id: existing.id },
        data: {
          departmentId: department === undefined ? undefined : department?.id || null,
          departmentSnapshot:
            department === undefined
              ? undefined
              : department?.name || existing.departmentSnapshot,
          positionTitle: dto.positionTitle?.trim() || undefined,
          positionSnapshot: dto.positionTitle?.trim() || undefined,
          type: dto.type ? this.normalizeType(dto.type) : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
          salary,
          currency: dto.currency?.trim() || undefined,
          probationEndDate:
            dto.probationEndDate !== undefined
              ? dto.probationEndDate
                ? new Date(dto.probationEndDate)
                : null
              : undefined,
          reportingManagerStaffId:
            dto.reportingManagerStaffId !== undefined
              ? dto.reportingManagerStaffId || null
              : undefined,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        },
      });

      if (salary !== undefined && salary !== Number(existing.salary)) {
        await tx.staffCompensationHistory.create({
          data: {
            hotelId,
            staffId: existing.staff.id,
            contractId: existing.id,
            amount: salary,
            currency: dto.currency?.trim() || existing.currency,
            effectiveFrom: dto.startDate ? new Date(dto.startDate) : new Date(),
            reason: 'CONTRACT_UPDATED',
            createdByUserId: actorUserId || null,
          },
        });
      }

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: existing.id,
        actorUserId,
        action: 'UPDATED',
        fromStatus: existing.status,
        toStatus: existing.status,
        metadata: {
          changedFields: Object.keys(dto).filter(
            (key) =>
              key !== 'status' && dto[key as keyof typeof dto] !== undefined,
          ),
        },
      });
    });

    return this.getOne(hotelId, existing.id);
  }

  async terminate(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    dto: {
      terminationDate: string;
      reason: string;
    },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
    });

    if (!existing) {
      throw new NotFoundException('Contract not found.');
    }

    const derivedStatus = this.deriveStatus(existing);
    if (!this.canTerminate(derivedStatus)) {
      throw new BadRequestException('Only active or expiring contracts can be terminated.');
    }

    const terminationDate = dayjs(dto.terminationDate).startOf('day');
    if (!terminationDate.isValid()) {
      throw new BadRequestException('Termination date is invalid.');
    }

    const startDate = dayjs(existing.startDate).startOf('day');
    if (terminationDate.isBefore(startDate)) {
      throw new BadRequestException('Termination date cannot be before the contract start date.');
    }

    if (existing.endDate) {
      const currentEndDate = dayjs(existing.endDate).startOf('day');
      if (terminationDate.isAfter(currentEndDate)) {
        throw new BadRequestException('Termination date cannot be after the contract end date.');
      }
    }

    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Termination reason is required.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.hrContract.update({
        where: { id: existing.id },
        data: {
          status: 'TERMINATED',
          endDate: terminationDate.toDate(),
          terminationDate: terminationDate.toDate(),
          terminationReason: reason,
          terminatedByUserId: actorUserId || null,
        },
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: existing.id,
        actorUserId,
        action: 'TERMINATED',
        fromStatus: existing.status,
        toStatus: 'TERMINATED',
        metadata: {
          terminationDate: terminationDate.toISOString(),
          reason,
        },
      });
    });

    return this.getOne(hotelId, existing.id);
  }

  async renew(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    dto: {
      startDate: string;
      endDate?: string;
      type?: string;
      positionTitle?: string;
      departmentId?: string;
      salary?: number;
      currency?: string;
      probationEndDate?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        renewedContracts: {
          select: { id: true },
        },
      } as any,
    });

    if (!existing) {
      throw new NotFoundException('Contract not found.');
    }

    const typedExisting = existing as any;

    const derivedStatus = this.deriveStatus(typedExisting);
    if (!this.canRenew(derivedStatus)) {
      throw new BadRequestException('Only active, expiring, or expired contracts can be renewed.');
    }

    if (typedExisting.status === 'SUPERSEDED' || typedExisting.renewedContracts.length > 0) {
      throw new BadRequestException('This contract has already been renewed.');
    }

    const renewalStartDate = dayjs(dto.startDate).startOf('day');
    if (!renewalStartDate.isValid()) {
      throw new BadRequestException('Renewal start date is invalid.');
    }

    if (typedExisting.endDate) {
      const existingEndDate = dayjs(typedExisting.endDate).startOf('day');
      if (!renewalStartDate.isAfter(existingEndDate)) {
        throw new BadRequestException('Renewal start date must be after the current contract end date.');
      }
    }

    const department = dto.departmentId !== undefined
      ? await this.ensureDepartment(hotelId, dto.departmentId)
      : typedExisting.departmentId
        ? await this.ensureDepartment(hotelId, typedExisting.departmentId)
        : null;

    const salary = dto.salary !== undefined ? Number(dto.salary) : Number(typedExisting.salary);
    if (salary < 0) {
      throw new BadRequestException('Salary must be zero or greater.');
    }

    const settings = await this.getContractSettings(hotelId);
    const contractNo = await this.generateContractNo(
      settings.hrContractSettings.numbering.renewalNumberPrefix,
    );
    const newType = this.normalizeType(dto.type || typedExisting.type);
    const newStatus = this.normalizeStatus(dto.status || 'ACTIVE');
    if (newStatus === 'ACTIVE') {
      this.assertDirectActivationAllowed({
        settings: settings.hrContractSettings,
        source: 'renew',
      });
    }
    const positionTitle = dto.positionTitle?.trim() || typedExisting.positionSnapshot;
    const newEndDate = dto.endDate ? new Date(dto.endDate) : null;

    const renewed = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hrContract.create({
        data: {
          hotelId,
          staffId: typedExisting.staffId,
          departmentId: department?.id || null,
          positionTitle,
          staffNameSnapshot: typedExisting.staffNameSnapshot,
          employeeCodeSnapshot: typedExisting.employeeCodeSnapshot,
          departmentSnapshot: department?.name || typedExisting.departmentSnapshot,
          positionSnapshot: positionTitle,
          contractNo,
          type: newType,
          status: newStatus,
          startDate: renewalStartDate.toDate(),
          endDate: newEndDate,
          salary,
          currency: dto.currency?.trim() || typedExisting.currency,
          probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
          reportingManagerStaffId: typedExisting.reportingManagerStaffId,
          notes: dto.notes?.trim() || typedExisting.notes,
          renewedFromContractId: typedExisting.id,
          activatedAt: newStatus === 'ACTIVE' ? new Date() : null,
        } as any,
      });

      await tx.staffCompensationHistory.create({
        data: {
          hotelId,
          staffId: typedExisting.staffId,
          contractId: created.id,
          amount: salary,
          currency: dto.currency?.trim() || typedExisting.currency,
          effectiveFrom: renewalStartDate.toDate(),
          reason: 'CONTRACT_RENEWED',
          createdByUserId: actorUserId || null,
        },
      });

      await tx.hrContract.update({
        where: { id: typedExisting.id },
        data: {
          status: 'SUPERSEDED',
        },
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: typedExisting.id,
        actorUserId,
        action: 'RENEWED_SOURCE',
        fromStatus: typedExisting.status,
        toStatus: 'SUPERSEDED',
        metadata: {
          successorContractNo: contractNo,
        },
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: created.id,
        actorUserId,
        action: 'RENEWED_TARGET',
        toStatus: newStatus,
        metadata: {
          renewedFromContractId: typedExisting.id,
          renewedFromContractNo: typedExisting.contractNo,
        },
      });

      return created;
    });

    return this.getOne(hotelId, renewed.id);
  }

  async submitForApproval(hotelId: string, id: string, actorUserId: string | null) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        documents: {
          select: { documentType: true },
        },
      } as any,
    });
    if (!existing) throw new NotFoundException('Contract not found.');

    if (!this.canSubmit(existing.status)) {
      throw new BadRequestException('Only draft or rejected contracts can be submitted for approval.');
    }

    const settings = await this.getContractSettings(hotelId);
    const availableDocumentTypes = new Set(
      (((existing as any).documents || []) as any[]).map((document: any) =>
        String(document.documentType),
      ),
    );
    this.assertDocumentPolicySatisfied({
      availableDocumentTypes,
      settings: settings.hrContractSettings,
      stage: 'submit',
    });

    const route = await this.resolveApprovalRoute(hotelId, existing.type);
    const sortedSteps = [...(route.steps || [])].sort(
      (left: any, right: any) => Number(left.stepOrder) - Number(right.stepOrder),
    );
    const firstStep = sortedSteps[0] || null;
    const submittedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).hrContractApproval.deleteMany({
        where: { contractId: existing.id },
      } as any);

      await (tx as any).hrContractApproval.createMany({
        data: route.steps.map((step: any) => ({
          hotelId,
          contractId: existing.id,
          routeName: route.name,
          stepOrder: step.stepOrder,
          role: this.normalizeRole(step.role),
          required: step.required ?? true,
          assignedUserId: step.userId || null,
          status: 'PENDING',
        })),
      } as any);

      await tx.hrContract.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING_APPROVAL',
          submittedAt,
          submittedByUserId: actorUserId || null,
          approvedAt: null,
          approvedByUserId: null,
          approvalComment: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectionReason: null,
        } as any,
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: existing.id,
        actorUserId,
        action: 'SUBMITTED',
        fromStatus: existing.status,
        toStatus: 'PENDING_APPROVAL',
        metadata: {
          routeName: route.name,
          steps: route.steps.map((step: any) => ({
            stepOrder: step.stepOrder,
            role: this.normalizeRole(step.role),
          })),
        },
      });
    });

    if (firstStep) {
      void this.dispatchApproverTurnNotification({
        hotelId,
        contractId: existing.id,
        contractNo: existing.contractNo,
        staffNameSnapshot: existing.staffNameSnapshot,
        departmentSnapshot: existing.departmentSnapshot,
        positionSnapshot: existing.positionSnapshot,
        submittedAt,
        stepOrder: Number(firstStep.stepOrder),
        role: this.normalizeRole(firstStep.role),
        assignedUserId: firstStep.userId || null,
        reason: 'submitted',
      }).catch((error) => {
        this.logger.warn(
          `Failed to dispatch approver-turn notification for submitted contract ${existing.id}: ${String(error)}`,
        );
      });
    }

    return this.getOne(hotelId, existing.id);
  }

  async approve(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    actorRole: string,
    dto: { comment?: string },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
      },
    } as any);
    if (!existing) throw new NotFoundException('Contract not found.');

    if (!this.canApprove(existing.status)) {
      throw new BadRequestException('Only pending contracts can be approved.');
    }

    const typedExisting = existing as any;
    const currentStep = (typedExisting.approvals || []).find(
      (approval: any) => approval.status === 'PENDING',
    );
    if (!currentStep) {
      throw new BadRequestException('This contract has no pending approval step.');
    }

    if (!this.canActOnApprovalStep(actorRole, currentStep.role)) {
      throw new BadRequestException('You are not allowed to approve the current step.');
    }

    const remainingPending = (typedExisting.approvals || []).filter(
      (approval: any) => approval.status === 'PENDING' && approval.id !== currentStep.id,
    );
    const nextStep =
      remainingPending
        .slice()
        .sort((left: any, right: any) => Number(left.stepOrder) - Number(right.stepOrder))[0] ||
      null;
    const submittedAt = typedExisting.submittedAt ? new Date(typedExisting.submittedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).hrContractApproval.update({
        where: { id: currentStep.id },
        data: {
          status: 'APPROVED',
          comment: dto.comment?.trim() || null,
          actedAt: new Date(),
          actedByUserId: actorUserId || null,
        } as any,
      });

      if (remainingPending.length === 0) {
        await tx.hrContract.update({
          where: { id: typedExisting.id },
          data: {
            status: 'AWAITING_SIGNATURE',
            approvedAt: new Date(),
            approvedByUserId: actorUserId || null,
            approvalComment: dto.comment?.trim() || null,
            signedAt: null,
            signedByUserId: null,
            activatedAt: null,
            rejectedAt: null,
            rejectedByUserId: null,
            rejectionReason: null,
          } as any,
        });
      }

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: typedExisting.id,
        actorUserId,
        action: 'APPROVED_STEP',
        fromStatus: typedExisting.status,
        toStatus: remainingPending.length === 0 ? 'AWAITING_SIGNATURE' : 'PENDING_APPROVAL',
        metadata: {
          stepOrder: currentStep.stepOrder,
          role: currentStep.role,
          comment: dto.comment?.trim() || null,
          completedContract: remainingPending.length === 0,
        },
      });
    });

    if (nextStep) {
      void this.dispatchApproverTurnNotification({
        hotelId,
        contractId: typedExisting.id,
        contractNo: typedExisting.contractNo,
        staffNameSnapshot: typedExisting.staffNameSnapshot,
        departmentSnapshot: typedExisting.departmentSnapshot,
        positionSnapshot: typedExisting.positionSnapshot,
        submittedAt,
        stepOrder: Number(nextStep.stepOrder),
        role: this.normalizeRole(nextStep.role),
        assignedUserId: nextStep.assignedUserId || null,
        reason: 'advanced',
      }).catch((error) => {
        this.logger.warn(
          `Failed to dispatch approver-turn notification for advanced contract ${typedExisting.id}: ${String(error)}`,
        );
      });
    }

    return this.getOne(hotelId, existing.id);
  }

  async reject(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    actorRole: string,
    dto: { reason: string },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
      },
    } as any);
    if (!existing) throw new NotFoundException('Contract not found.');

    if (!this.canApprove(existing.status)) {
      throw new BadRequestException('Only pending contracts can be rejected.');
    }

    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Rejection reason is required.');
    }

    const typedExisting = existing as any;
    const currentStep = (typedExisting.approvals || []).find(
      (approval: any) => approval.status === 'PENDING',
    );
    if (!currentStep) {
      throw new BadRequestException('This contract has no pending approval step.');
    }

    if (!this.canActOnApprovalStep(actorRole, currentStep.role)) {
      throw new BadRequestException('You are not allowed to reject the current step.');
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).hrContractApproval.update({
        where: { id: currentStep.id },
        data: {
          status: 'REJECTED',
          comment: reason,
          actedAt: new Date(),
          actedByUserId: actorUserId || null,
        } as any,
      });

      await tx.hrContract.update({
        where: { id: typedExisting.id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedByUserId: actorUserId || null,
          rejectionReason: reason,
        } as any,
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: typedExisting.id,
        actorUserId,
        action: 'REJECTED',
        fromStatus: typedExisting.status,
        toStatus: 'REJECTED',
        metadata: {
          stepOrder: currentStep.stepOrder,
          role: currentStep.role,
          reason,
        },
      });
    });

    return this.getOne(hotelId, existing.id);
  }

  async sign(
    hotelId: string,
    id: string,
    actorUserId: string | null,
    dto: { comment?: string },
  ) {
    const existing = await this.prisma.hrContract.findFirst({
      where: { id, hotelId },
      include: {
        documents: {
          select: { documentType: true },
        },
      } as any,
    });
    if (!existing) throw new NotFoundException('Contract not found.');

    if (!this.canSign(existing.status)) {
      throw new BadRequestException('Only contracts awaiting signature can be marked as signed.');
    }

    const settings = await this.getContractSettings(hotelId);
    const availableDocumentTypes = new Set(
      (((existing as any).documents || []) as any[]).map((document: any) =>
        String(document.documentType),
      ),
    );
    this.assertDocumentPolicySatisfied({
      availableDocumentTypes,
      settings: settings.hrContractSettings,
      stage: 'sign',
    });

    const signedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.hrContract.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          signedAt,
          signedByUserId: actorUserId || null,
          activatedAt: signedAt,
        } as any,
      });

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: existing.id,
        actorUserId,
        action: 'SIGNED',
        fromStatus: existing.status,
        toStatus: 'ACTIVE',
        metadata: {
          comment: dto.comment?.trim() || null,
          signedAt: signedAt.toISOString(),
        },
      });
    });

    return this.getOne(hotelId, existing.id);
  }

  async downloadSummary(hotelId: string, id: string) {
    const contract = await this.getOne(hotelId, id);
    const settings = await this.getContractSettings(hotelId);
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, address: true, phone: true, email: true },
    });

    const buffer = await this.buildContractPdfBuffer({
      hotelName: hotel?.name ?? 'HotelOS',
      hotelAddress: hotel?.address ?? '',
      hotelPhone: hotel?.phone ?? '',
      hotelEmail: hotel?.email ?? '',
      accentColor: settings.hrContractSettings.template.accentColor,
      headerTitle: settings.hrContractSettings.template.headerTitle,
      contractNo: contract.contractNo,
      contractType: this.humanizeValue(contract.type),
      contractStatus: this.humanizeValue(contract.derivedStatus),
      staffName: contract.staffNameSnapshot,
      employeeCode: contract.employeeCodeSnapshot,
      department: contract.departmentSnapshot,
      position: contract.positionSnapshot,
      salary: this.formatMoney(Number(contract.salary), contract.currency),
      startDate: dayjs(contract.startDate).format('YYYY-MM-DD'),
      endDate: contract.endDate ? dayjs(contract.endDate).format('YYYY-MM-DD') : 'Open-ended',
      probationEndDate: contract.probationEndDate
        ? dayjs(contract.probationEndDate).format('YYYY-MM-DD')
        : 'N/A',
      introductionText: settings.hrContractSettings.template.introductionText,
      notes: contract.notes || 'No notes added.',
      footerNote: settings.hrContractSettings.template.footerNote,
      showSignatureLines: settings.hrContractSettings.template.showSignatureLines,
      generatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    });

    const fileName = `${contract.contractNo}.pdf`;
    const fileUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const existingGeneratedDocument = await this.prisma.hrContractDocument.findFirst({
      where: {
        hotelId,
        contractId: contract.id,
        documentType: 'CONTRACT_DOCUMENT',
        source: 'GENERATED',
      },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existingGeneratedDocument) {
        await tx.hrContractDocument.update({
          where: { id: existingGeneratedDocument.id },
          data: {
            fileName,
            fileUrl,
            mimeType: 'application/pdf',
            fileSizeBytes: buffer.length,
            uploadedAt: new Date(),
          },
        });
      } else {
        await tx.hrContractDocument.create({
          data: {
            hotelId,
            contractId: contract.id,
            documentType: 'CONTRACT_DOCUMENT',
            source: 'GENERATED',
            fileName,
            fileUrl,
            mimeType: 'application/pdf',
            fileSizeBytes: buffer.length,
          },
        });
      }

      await this.recordAuditLog(tx, {
        hotelId,
        contractId: contract.id,
        action: 'DOCUMENT_GENERATED',
        fromStatus: contract.status,
        toStatus: contract.status,
        metadata: {
          documentType: 'CONTRACT_DOCUMENT',
          fileName,
        },
      });
    });

    return {
      fileName,
      buffer,
    };
  }

  private humanizeValue(value: string) {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatMoney(amount: number, currency = 'NGN') {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private buildContractPdfBuffer(payload: {
    hotelName: string;
    hotelAddress: string;
    hotelPhone: string;
    hotelEmail: string;
    accentColor: string;
    headerTitle: string;
    contractNo: string;
    contractType: string;
    contractStatus: string;
    staffName: string;
    employeeCode: string;
    department: string;
    position: string;
    salary: string;
    startDate: string;
    endDate: string;
    probationEndDate: string;
    introductionText: string;
    notes: string;
    footerNote: string;
    showSignatureLines: boolean;
    generatedAt: string;
  }) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(22)
        .fillColor('#0f172a')
        .text(payload.hotelName, { align: 'left' });

      doc
        .moveDown(0.2)
        .fontSize(10)
        .fillColor('#475569')
        .text([payload.hotelAddress, payload.hotelPhone, payload.hotelEmail].filter(Boolean).join(' • '));

      doc.moveDown(1);
      doc
        .fontSize(18)
        .fillColor(payload.accentColor)
        .text(payload.headerTitle, { align: 'left' });

      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Contract No: ${payload.contractNo}`)
        .text(`Generated: ${payload.generatedAt}`);

      doc.moveDown(1);
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text(payload.introductionText, {
          align: 'left',
          lineGap: 2,
        });

      doc.moveDown(0.8);
      this.writePdfSection(doc, 'Contract Summary', [
        ['Contract Type', payload.contractType],
        ['Status', payload.contractStatus],
        ['Start Date', payload.startDate],
        ['End Date', payload.endDate],
        ['Probation End', payload.probationEndDate],
      ]);

      this.writePdfSection(doc, 'Employee Snapshot', [
        ['Staff Name', payload.staffName],
        ['Employee Code', payload.employeeCode],
        ['Department', payload.department],
        ['Position', payload.position],
      ]);

      this.writePdfSection(doc, 'Compensation', [['Monthly Salary', payload.salary]]);

      doc.moveDown(0.8);
      doc
        .fontSize(12)
        .fillColor('#0f172a')
        .text('Terms and Notes');
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text(payload.notes, {
          align: 'left',
          lineGap: 2,
        });

      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor('#94a3b8')
        .text(payload.footerNote, { align: 'left' });

      if (payload.showSignatureLines) {
        doc.moveDown(2);
        doc
          .fontSize(11)
          .fillColor('#0f172a')
          .text('Signatures', { underline: true });
        doc.moveDown(1.2);
        doc.text('Employee: ________________________________');
        doc.moveDown(1.2);
        doc.text('Hotel Representative: ____________________');
      }

      doc.end();
    });
  }

  private writePdfSection(
    doc: PDFKit.PDFDocument,
    title: string,
    rows: Array<[string, string]>,
  ) {
    doc.moveDown(0.9);
    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text(title);
    doc.moveDown(0.25);

    rows.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text(label, { continued: true, width: 140 })
        .fillColor('#111827')
        .text(` ${value}`);
      doc.moveDown(0.15);
    });
  }

  async uploadDocument(
    hotelId: string,
    contractId: string,
    actorUserId: string | null,
    dto: {
      documentType: string;
      fileName: string;
      fileUrl: string;
      mimeType?: string;
      fileSizeBytes?: number;
      source?: string;
    },
  ) {
    const settings = await this.getContractSettings(hotelId);
    const contract = await this.prisma.hrContract.findFirst({
      where: { id: contractId, hotelId },
      select: { id: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }

    if (!dto.fileName.trim()) {
      throw new BadRequestException('File name is required.');
    }
    if (!dto.fileUrl.trim()) {
      throw new BadRequestException('File reference is required.');
    }

    const fileUrl = dto.fileUrl.trim();
    const normalizedDocumentType = dto.documentType.trim().toUpperCase();
    const normalizedSource = dto.source?.trim().toUpperCase() || 'UPLOADED';
    if (
      !fileUrl.startsWith('data:') &&
      !fileUrl.startsWith('http://') &&
      !fileUrl.startsWith('https://')
    ) {
      throw new BadRequestException('Unsupported document reference.');
    }

    if (
      normalizedSource === 'UPLOADED' &&
      !settings.hrContractSettings.documentPolicy.allowSupportingDocuments &&
      !settings.hrContractSettings.documentPolicy.requiredDocumentTypes.includes(
        normalizedDocumentType,
      )
    ) {
      throw new BadRequestException(
        'This hotel only allows uploaded documents that match the required contract document policy.',
      );
    }

    const created = await this.prisma.hrContractDocument.create({
      data: {
        hotelId,
        contractId: contract.id,
        documentType: normalizedDocumentType,
        source: normalizedSource,
        fileName: dto.fileName.trim(),
        fileUrl,
        mimeType: dto.mimeType?.trim() || null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
        uploadedByUserId: actorUserId || null,
      },
    });

    await this.recordAuditLog(this.prisma, {
      hotelId,
      contractId: contract.id,
      actorUserId,
      action: 'DOCUMENT_UPLOADED',
      metadata: {
        documentType: normalizedDocumentType,
        fileName: dto.fileName.trim(),
        source: normalizedSource,
      },
    });

    return created;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
