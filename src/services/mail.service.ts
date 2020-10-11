import { injectable } from "inversify";
import Email from "email-templates";
import nodemailer from "nodemailer";
import mg from "nodemailer-mailgun-transport";
import { logger } from "../utils/logger";

type EmailTemplates = {
  verify: {
    link: string;
    name: string;
  };
  welcome: {
    name: string;
  };
  resetPassword: {
    link: string;
    name: string;
    expiryTimeHours: number;
  };
};

type TemplateType = keyof EmailTemplates;

type EmailTemplate<T extends TemplateType> = {
  template: T;
  locals: EmailTemplates[T];
  message: {
    to: string;
  };
};

@injectable()
export class MailService {
  email: Email;

  constructor() {
    const auth = {
      auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
      },
    };

    const nodemailerMailgun = nodemailer.createTransport(mg(auth));

    this.email = new Email({
      message: {
        from: process.env.MAIL_FROM,
      },
      send: false,
      transport: nodemailerMailgun,
    });
  }

  public async sendForgotPasswordMail(
    to: string,
    params: EmailTemplates["resetPassword"]
  ): Promise<boolean> {
    const myEmail: EmailTemplate<"resetPassword"> = {
      template: "resetPassword",
      message: {
        to,
      },
      locals: params,
    };

    return this.sendMail(myEmail);
  }

  public async sendVerifyMail(
    to: string,
    params: EmailTemplates["verify"]
  ): Promise<boolean> {
    const myEmail: EmailTemplate<"verify"> = {
      template: "verify",
      message: {
        to,
      },
      locals: params,
    };

    return this.sendMail(myEmail);
  }

  public async sendWelcomeMail(to: string, params: EmailTemplates["welcome"]) {
    const myEmail: EmailTemplate<"welcome"> = {
      template: "welcome",
      message: {
        to,
      },
      locals: params,
    };

    return this.sendMail(myEmail);
  }

  private async sendMail(mail: Email.EmailOptions): Promise<boolean> {
    try {
      await this.email.send(mail);
    } catch (e) {
      logger.error("Send mail error");
      logger.error(e);
      return false;
    }

    return true;
  }
}
