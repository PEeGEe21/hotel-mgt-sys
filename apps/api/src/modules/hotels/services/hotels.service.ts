import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelCronJobType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';
import { RunnableHotelCronJob, RunHotelCronJobDto } from '../dtos/run-hotel-cron-job.dto';
import { ReservationsService } from '../../reservations/services/reservations.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { FacilitiesService } from '../../facilities/services/facilities.service';
import { EntitlementsService } from '../../entitlements/entitlements.service';

const HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE =
  'HOUSEKEEPING_FOLLOW_UP_SCAN' as HotelCronJobType;
const UPCOMING_ARRIVAL_SCAN_JOB_TYPE =
  'UPCOMING_ARRIVAL_SCAN' as HotelCronJobType;
const NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE = 'NO_SHOW_FOLLOW_UP_SCAN' as HotelCronJobType;
const MAINTENANCE_ESCALATION_SCAN_JOB_TYPE =
  'MAINTENANCE_ESCALATION_SCAN' as HotelCronJobType;
const DAILY_DIGEST_SCAN_JOB_TYPE = 'DAILY_DIGEST_SCAN' as HotelCronJobType;

@Injectable()
export class HotelsService {
  constructor(
    private prisma: PrismaService,
    private reservationsService: ReservationsService,
    private attendanceService: AttendanceService,
    private facilitiesService: FacilitiesService,
    private entitlementsService: EntitlementsService,
  ) {}

  private buildDefaultCronSettings() {
    return {
      attendanceAbsenceScanEnabled: true,
      attendanceAbsenceScanHour: 9,
      attendanceAbsenceScanMinute: 15,
      attendanceAbsenceScanLastTriggeredAt: null,
      attendanceAbsenceScanLastSucceededAt: null,
      attendanceAbsenceScanLastFailedAt: null,
      attendanceAbsenceScanLastError: null,
      checkoutDueScanEnabled: true,
      checkoutDueScanHour: 11,
      checkoutDueScanMinute: 0,
      checkoutDueScanLastTriggeredAt: null,
      checkoutDueScanLastSucceededAt: null,
      checkoutDueScanLastFailedAt: null,
      checkoutDueScanLastError: null,
      upcomingArrivalScanEnabled: true,
      upcomingArrivalScanHour: 18,
      upcomingArrivalScanMinute: 0,
      upcomingArrivalScanLastTriggeredAt: null,
      upcomingArrivalScanLastSucceededAt: null,
      upcomingArrivalScanLastFailedAt: null,
      upcomingArrivalScanLastError: null,
      overduePaymentScanEnabled: true,
      overduePaymentScanHour: 13,
      overduePaymentScanMinute: 0,
      overduePaymentScanLastTriggeredAt: null,
      overduePaymentScanLastSucceededAt: null,
      overduePaymentScanLastFailedAt: null,
      overduePaymentScanLastError: null,
      housekeepingFollowUpScanEnabled: false,
      housekeepingFollowUpScanHour: 15,
      housekeepingFollowUpScanMinute: 0,
      housekeepingFollowUpScanLastTriggeredAt: null,
      housekeepingFollowUpScanLastSucceededAt: null,
      housekeepingFollowUpScanLastFailedAt: null,
      housekeepingFollowUpScanLastError: null,
      noShowFollowUpScanEnabled: true,
      noShowFollowUpScanHour: 20,
      noShowFollowUpScanMinute: 0,
      noShowFollowUpScanLastTriggeredAt: null,
      noShowFollowUpScanLastSucceededAt: null,
      noShowFollowUpScanLastFailedAt: null,
      noShowFollowUpScanLastError: null,
      maintenanceEscalationScanEnabled: true,
      maintenanceEscalationScanHour: 16,
      maintenanceEscalationScanMinute: 0,
      maintenanceEscalationScanLastTriggeredAt: null,
      maintenanceEscalationScanLastSucceededAt: null,
      maintenanceEscalationScanLastFailedAt: null,
      maintenanceEscalationScanLastError: null,
      dailyDigestScanEnabled: true,
      dailyDigestScanHour: 19,
      dailyDigestScanMinute: 0,
      dailyDigestScanLastTriggeredAt: null,
      dailyDigestScanLastSucceededAt: null,
      dailyDigestScanLastFailedAt: null,
      dailyDigestScanLastError: null,
    };
  }

  private buildDefaultInvoiceTemplateSettings() {
    return {
      accentColor: '#1d4ed8',
      headerTitle: 'Invoice',
      footerNote: 'Thank you for your business.',
      showLogo: true,
      showTaxBreakdown: true,
      showNotes: true,
    };
  }

  private buildDefaultHrContractSettings() {
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
        staleApprovalReminderDays: 3,
        staleSignatureReminderDays: 3,
        digestRecipientRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      },
    };
  }

  private coerceInvoiceTemplateSettings(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return this.buildDefaultInvoiceTemplateSettings();
    }

    const raw = value as Record<string, unknown>;
    const defaults = this.buildDefaultInvoiceTemplateSettings();

    return {
      accentColor:
        typeof raw.accentColor === 'string' && raw.accentColor.trim()
          ? raw.accentColor.trim()
          : defaults.accentColor,
      headerTitle:
        typeof raw.headerTitle === 'string' && raw.headerTitle.trim()
          ? raw.headerTitle.trim()
          : defaults.headerTitle,
      footerNote:
        typeof raw.footerNote === 'string' && raw.footerNote.trim()
          ? raw.footerNote.trim()
          : defaults.footerNote,
      showLogo:
        typeof raw.showLogo === 'boolean' ? raw.showLogo : defaults.showLogo,
      showTaxBreakdown:
        typeof raw.showTaxBreakdown === 'boolean'
          ? raw.showTaxBreakdown
          : defaults.showTaxBreakdown,
      showNotes:
        typeof raw.showNotes === 'boolean' ? raw.showNotes : defaults.showNotes,
    };
  }

  private coerceHrContractSettings(value: unknown) {
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

  async getProfile(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        cronSettings: true,
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found.');

    const attendanceCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const checkoutCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.CHECKOUT_DUE_SCAN,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const upcomingArrivalCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const housekeepingFollowUpCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const overduePaymentCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.OVERDUE_PAYMENT_SCAN,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const noShowFollowUpCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const maintenanceEscalationCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const dailyDigestCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === DAILY_DIGEST_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;

    return {
      ...hotel,
      invoiceTemplateSettings: this.coerceInvoiceTemplateSettings(hotel.invoiceTemplateSettings),
      hrContractSettings: this.coerceHrContractSettings((hotel as any).hrContractSettings),
      cronSettings: {
        attendanceAbsenceScanEnabled:
          attendanceCronSetting?.enabled ?? this.buildDefaultCronSettings().attendanceAbsenceScanEnabled,
        attendanceAbsenceScanHour:
          attendanceCronSetting?.runAtHour ?? this.buildDefaultCronSettings().attendanceAbsenceScanHour,
        attendanceAbsenceScanMinute:
          attendanceCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().attendanceAbsenceScanMinute,
        attendanceAbsenceScanLastTriggeredAt: attendanceCronSetting?.lastTriggeredAt ?? null,
        attendanceAbsenceScanLastSucceededAt: attendanceCronSetting?.lastSucceededAt ?? null,
        attendanceAbsenceScanLastFailedAt: attendanceCronSetting?.lastFailedAt ?? null,
        attendanceAbsenceScanLastError: attendanceCronSetting?.lastError ?? null,
        checkoutDueScanEnabled:
          checkoutCronSetting?.enabled ?? this.buildDefaultCronSettings().checkoutDueScanEnabled,
        checkoutDueScanHour:
          checkoutCronSetting?.runAtHour ?? this.buildDefaultCronSettings().checkoutDueScanHour,
        checkoutDueScanMinute:
          checkoutCronSetting?.runAtMinute ?? this.buildDefaultCronSettings().checkoutDueScanMinute,
        checkoutDueScanLastTriggeredAt: checkoutCronSetting?.lastTriggeredAt ?? null,
        checkoutDueScanLastSucceededAt: checkoutCronSetting?.lastSucceededAt ?? null,
        checkoutDueScanLastFailedAt: checkoutCronSetting?.lastFailedAt ?? null,
        checkoutDueScanLastError: checkoutCronSetting?.lastError ?? null,
        upcomingArrivalScanEnabled:
          upcomingArrivalCronSetting?.enabled ??
          this.buildDefaultCronSettings().upcomingArrivalScanEnabled,
        upcomingArrivalScanHour:
          upcomingArrivalCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().upcomingArrivalScanHour,
        upcomingArrivalScanMinute:
          upcomingArrivalCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().upcomingArrivalScanMinute,
        upcomingArrivalScanLastTriggeredAt:
          upcomingArrivalCronSetting?.lastTriggeredAt ?? null,
        upcomingArrivalScanLastSucceededAt:
          upcomingArrivalCronSetting?.lastSucceededAt ?? null,
        upcomingArrivalScanLastFailedAt:
          upcomingArrivalCronSetting?.lastFailedAt ?? null,
        upcomingArrivalScanLastError: upcomingArrivalCronSetting?.lastError ?? null,
        overduePaymentScanEnabled:
          overduePaymentCronSetting?.enabled ??
          this.buildDefaultCronSettings().overduePaymentScanEnabled,
        overduePaymentScanHour:
          overduePaymentCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().overduePaymentScanHour,
        overduePaymentScanMinute:
          overduePaymentCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().overduePaymentScanMinute,
        overduePaymentScanLastTriggeredAt: overduePaymentCronSetting?.lastTriggeredAt ?? null,
        overduePaymentScanLastSucceededAt: overduePaymentCronSetting?.lastSucceededAt ?? null,
        overduePaymentScanLastFailedAt: overduePaymentCronSetting?.lastFailedAt ?? null,
        overduePaymentScanLastError: overduePaymentCronSetting?.lastError ?? null,
        housekeepingFollowUpScanEnabled:
          housekeepingFollowUpCronSetting?.enabled ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanEnabled,
        housekeepingFollowUpScanHour:
          housekeepingFollowUpCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanHour,
        housekeepingFollowUpScanMinute:
          housekeepingFollowUpCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanMinute,
        housekeepingFollowUpScanLastTriggeredAt:
          housekeepingFollowUpCronSetting?.lastTriggeredAt ?? null,
        housekeepingFollowUpScanLastSucceededAt:
          housekeepingFollowUpCronSetting?.lastSucceededAt ?? null,
        housekeepingFollowUpScanLastFailedAt:
          housekeepingFollowUpCronSetting?.lastFailedAt ?? null,
        housekeepingFollowUpScanLastError: housekeepingFollowUpCronSetting?.lastError ?? null,
        noShowFollowUpScanEnabled:
          noShowFollowUpCronSetting?.enabled ??
          this.buildDefaultCronSettings().noShowFollowUpScanEnabled,
        noShowFollowUpScanHour:
          noShowFollowUpCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().noShowFollowUpScanHour,
        noShowFollowUpScanMinute:
          noShowFollowUpCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().noShowFollowUpScanMinute,
        noShowFollowUpScanLastTriggeredAt:
          noShowFollowUpCronSetting?.lastTriggeredAt ?? null,
        noShowFollowUpScanLastSucceededAt:
          noShowFollowUpCronSetting?.lastSucceededAt ?? null,
        noShowFollowUpScanLastFailedAt: noShowFollowUpCronSetting?.lastFailedAt ?? null,
        noShowFollowUpScanLastError: noShowFollowUpCronSetting?.lastError ?? null,
        maintenanceEscalationScanEnabled:
          maintenanceEscalationCronSetting?.enabled ??
          this.buildDefaultCronSettings().maintenanceEscalationScanEnabled,
        maintenanceEscalationScanHour:
          maintenanceEscalationCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().maintenanceEscalationScanHour,
        maintenanceEscalationScanMinute:
          maintenanceEscalationCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().maintenanceEscalationScanMinute,
        maintenanceEscalationScanLastTriggeredAt:
          maintenanceEscalationCronSetting?.lastTriggeredAt ?? null,
        maintenanceEscalationScanLastSucceededAt:
          maintenanceEscalationCronSetting?.lastSucceededAt ?? null,
        maintenanceEscalationScanLastFailedAt:
          maintenanceEscalationCronSetting?.lastFailedAt ?? null,
        maintenanceEscalationScanLastError:
          maintenanceEscalationCronSetting?.lastError ?? null,
        dailyDigestScanEnabled:
          dailyDigestCronSetting?.enabled ??
          this.buildDefaultCronSettings().dailyDigestScanEnabled,
        dailyDigestScanHour:
          dailyDigestCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().dailyDigestScanHour,
        dailyDigestScanMinute:
          dailyDigestCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().dailyDigestScanMinute,
        dailyDigestScanLastTriggeredAt: dailyDigestCronSetting?.lastTriggeredAt ?? null,
        dailyDigestScanLastSucceededAt: dailyDigestCronSetting?.lastSucceededAt ?? null,
        dailyDigestScanLastFailedAt: dailyDigestCronSetting?.lastFailedAt ?? null,
        dailyDigestScanLastError: dailyDigestCronSetting?.lastError ?? null,
      },
    };
  }

  async getFeatureAccess(hotelId: string) {
    const resolved = await this.entitlementsService.resolveHotelEntitlements(hotelId);
    const itemByKey = new Map(resolved.items.map((item) => [item.key, item]));

    return {
      flags: resolved.features,
      limits: resolved.limits,
      warnings: resolved.warnings,
      sources: Object.fromEntries(
        resolved.items.map((item) => [
          item.key,
          {
            globalEnabled: item.globalEnabled,
            defaultEnabled: item.defaultEnabled,
            planEnabled: item.planEnabled,
            overrideEnabled: item.overrideEnabled,
            hotelEnabled: item.hotelRolloutEnabled,
            effectiveEnabled: item.effectiveEnabled,
          },
        ]),
      ),
      plan: resolved.plan,
      subscriptionStatus: resolved.subscriptionStatus,
      keycardAuth:
        itemByKey.get('keycard_auth') !== undefined
          ? {
              globalEnabled: itemByKey.get('keycard_auth')?.globalEnabled === true,
              hotelEnabled: itemByKey.get('keycard_auth')?.hotelRolloutEnabled === true,
            }
          : null,
    };
  }

  async getEntitlements(hotelId: string) {
    const [hotel, resolved, openCasesCount, plans] = await Promise.all([
      (this.prisma.hotel as any).findUnique({
        where: { id: hotelId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
      this.entitlementsService.resolveHotelEntitlements(hotelId),
      (this.prisma as any).supportCase.count({
        where: {
          hotelId,
          status: {
            in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL'],
          },
        },
      }),
      (this.prisma as any).subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
      }),
    ]);

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    return {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        email: hotel.email,
      },
      subscription: {
        plan: resolved.plan,
        status: resolved.subscriptionStatus,
      },
      features: resolved.features,
      limits: resolved.limits,
      warnings: resolved.warnings,
      items: resolved.items,
      support: {
        supportAvailable: true,
        supportTier: resolved.plan?.code ?? 'STANDARD',
        openCasesCount,
        contactMode: 'IN_APP_CASES',
      },
      requestablePlans: plans
        .filter((plan: any) => plan.code !== resolved.plan?.code)
        .map((plan: any) => ({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description ?? null,
        })),
    };
  }

  async updateProfile(hotelId: string, dto: UpdateHotelDto, actorUserId?: string) {
    const currentProfile = await this.getProfile(hotelId);
    const { cronSettings, invoiceTemplateSettings, hrContractSettings, ...hotelData } = dto;

    await this.prisma.$transaction(async (tx) => {
      await tx.hotel.update({
        where: { id: hotelId },
        data: {
          ...hotelData,
          ...(invoiceTemplateSettings
            ? {
                invoiceTemplateSettings:
                  this.coerceInvoiceTemplateSettings(invoiceTemplateSettings) as Prisma.InputJsonValue,
              }
            : {}),
          ...(hrContractSettings
            ? {
                hrContractSettings:
                  this.coerceHrContractSettings(hrContractSettings) as Prisma.InputJsonValue,
              }
            : {}),
        } as any,
      });

      if (cronSettings) {
        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.upcomingArrivalScanEnabled,
            runAtHour: cronSettings.upcomingArrivalScanHour,
            runAtMinute: cronSettings.upcomingArrivalScanMinute,
          },
          create: {
            hotelId,
            jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
            enabled: cronSettings.upcomingArrivalScanEnabled ?? true,
            runAtHour: cronSettings.upcomingArrivalScanHour ?? 18,
            runAtMinute: cronSettings.upcomingArrivalScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
            },
          },
          update: {
            enabled: cronSettings.attendanceAbsenceScanEnabled,
            runAtHour: cronSettings.attendanceAbsenceScanHour,
            runAtMinute: cronSettings.attendanceAbsenceScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
            enabled: cronSettings.attendanceAbsenceScanEnabled ?? true,
            runAtHour: cronSettings.attendanceAbsenceScanHour ?? 9,
            runAtMinute: cronSettings.attendanceAbsenceScanMinute ?? 15,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
            },
          },
          update: {
            enabled: cronSettings.checkoutDueScanEnabled,
            runAtHour: cronSettings.checkoutDueScanHour,
            runAtMinute: cronSettings.checkoutDueScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
            enabled: cronSettings.checkoutDueScanEnabled ?? true,
            runAtHour: cronSettings.checkoutDueScanHour ?? 11,
            runAtMinute: cronSettings.checkoutDueScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HotelCronJobType.OVERDUE_PAYMENT_SCAN,
            },
          },
          update: {
            enabled: cronSettings.overduePaymentScanEnabled,
            runAtHour: cronSettings.overduePaymentScanHour,
            runAtMinute: cronSettings.overduePaymentScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.OVERDUE_PAYMENT_SCAN,
            enabled: cronSettings.overduePaymentScanEnabled ?? true,
            runAtHour: cronSettings.overduePaymentScanHour ?? 13,
            runAtMinute: cronSettings.overduePaymentScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.housekeepingFollowUpScanEnabled,
            runAtHour: cronSettings.housekeepingFollowUpScanHour,
            runAtMinute: cronSettings.housekeepingFollowUpScanMinute,
          },
          create: {
            hotelId,
            jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled: cronSettings.housekeepingFollowUpScanEnabled ?? false,
            runAtHour: cronSettings.housekeepingFollowUpScanHour ?? 15,
            runAtMinute: cronSettings.housekeepingFollowUpScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.noShowFollowUpScanEnabled,
            runAtHour: cronSettings.noShowFollowUpScanHour,
            runAtMinute: cronSettings.noShowFollowUpScanMinute,
          },
          create: {
            hotelId,
            jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled: cronSettings.noShowFollowUpScanEnabled ?? true,
            runAtHour: cronSettings.noShowFollowUpScanHour ?? 20,
            runAtMinute: cronSettings.noShowFollowUpScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.maintenanceEscalationScanEnabled,
            runAtHour: cronSettings.maintenanceEscalationScanHour,
            runAtMinute: cronSettings.maintenanceEscalationScanMinute,
          },
          create: {
            hotelId,
            jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
            enabled: cronSettings.maintenanceEscalationScanEnabled ?? true,
            runAtHour: cronSettings.maintenanceEscalationScanHour ?? 16,
            runAtMinute: cronSettings.maintenanceEscalationScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.dailyDigestScanEnabled,
            runAtHour: cronSettings.dailyDigestScanHour,
            runAtMinute: cronSettings.dailyDigestScanMinute,
          },
          create: {
            hotelId,
            jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
            enabled: cronSettings.dailyDigestScanEnabled ?? true,
            runAtHour: cronSettings.dailyDigestScanHour ?? 19,
            runAtMinute: cronSettings.dailyDigestScanMinute ?? 0,
          },
        });
      }
    });

    if (actorUserId) {
      const keycardChangedFields = ['keycardAuthEnabled', 'lockVendor', 'lockApiKey', 'lockApiConfig']
        .filter((field) => field in hotelData)
        .filter((field) => {
          const before = (currentProfile as Record<string, unknown>)[field] ?? null;
          const after = (hotelData as Record<string, unknown>)[field] ?? null;
          return JSON.stringify(before) !== JSON.stringify(after);
        });

      if (keycardChangedFields.length > 0) {
        await this.prisma.auditLog.create({
          data: {
            hotelId,
            actorUserId,
            action: 'hotel.keycard.settings_update',
            targetType: 'HOTEL',
            targetId: hotelId,
            metadata: {
              changedFields: keycardChangedFields,
            },
          },
        });
      }
    }

    return this.getProfile(hotelId);
  }

  async runCronJob(hotelId: string, dto: RunHotelCronJobDto) {
    await this.getProfile(hotelId);

    const result = await this.runRequestedCronJob(hotelId, dto.job);

    return {
      job: dto.job,
      result,
      profile: await this.getProfile(hotelId),
    };
  }

  private runRequestedCronJob(hotelId: string, job: RunnableHotelCronJob) {
    if (job === 'attendanceAbsenceScan') {
      return this.attendanceService.runAbsenceDetectionForDate(new Date(), hotelId, true);
    }

    if (job === 'checkoutDueScan') {
      return this.reservationsService.runCheckoutDueScanForDate(new Date(), hotelId, true);
    }

    if (job === 'upcomingArrivalScan') {
      return this.reservationsService.runUpcomingArrivalScanForDate(new Date(), hotelId, true);
    }

    if (job === 'overduePaymentScan') {
      return this.reservationsService.runOverduePaymentScanForDate(new Date(), hotelId, true);
    }

    if (job === 'housekeepingFollowUpScan') {
      return this.reservationsService.runHousekeepingFollowUpScanForDate(new Date(), hotelId, true);
    }

    if (job === 'noShowFollowUpScan') {
      return this.reservationsService.runNoShowFollowUpScanForDate(new Date(), hotelId, true);
    }

    if (job === 'maintenanceEscalationScan') {
      return this.facilitiesService.runMaintenanceEscalationScanForDate(new Date(), hotelId, true);
    }

    return this.reservationsService.runDailyDigestScanForDate(new Date(), hotelId, true);
  }
}
