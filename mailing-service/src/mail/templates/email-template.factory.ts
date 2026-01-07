import { EmailTemplate } from '../interfaces/email.interface';
import { PasswordResetTemplate } from './password-reset.template';
import { WelcomeTemplate } from './welcome.template';

export class EmailTemplateFactory {
  private readonly passwordResetTemplate: PasswordResetTemplate;
  private readonly welcomeTemplate: WelcomeTemplate;

  constructor(private readonly productName: string) {
    this.passwordResetTemplate = new PasswordResetTemplate(productName);
    this.welcomeTemplate = new WelcomeTemplate(productName);
  }

  /**
   * Génère le template pour la réinitialisation du mot de passe
   */
  createPasswordResetTemplate(payload: {
    username: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): EmailTemplate {
    return this.passwordResetTemplate.create(payload);
  }

  /**
   * Génère le template de bienvenue
   */
  createWelcomeTemplate(payload: {
    username: string;
    activationUrl?: string;
  }): EmailTemplate {
    return this.welcomeTemplate.create(payload);
  }
}
