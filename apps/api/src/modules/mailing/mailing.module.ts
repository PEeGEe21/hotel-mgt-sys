import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/email/email.module';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';

@Module({
  imports: [EmailModule],
  controllers: [MailingController],
  providers: [MailingService],
})
export class MailingModule {}
