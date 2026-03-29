import { EmailTemplateFactory } from '../mail/templates/email-template.factory';
import { WelcomeTemplate } from '../mail/templates/welcome.template';
import { PasswordResetTemplate } from '../mail/templates/password-reset.template';

describe('EmailTemplateFactory', () => {
  let factory: EmailTemplateFactory;
  const productName = 'Test Event Thunder';

  beforeEach(() => {
    factory = new EmailTemplateFactory(productName);
  });

  describe('initialization', () => {
    it('should create factory with product name', () => {
      expect(factory).toBeDefined();
    });

    it('should initialize with custom product name', () => {
      const customFactory = new EmailTemplateFactory('Custom App Name');
      expect(customFactory).toBeDefined();
    });
  });

  describe('createPasswordResetTemplate', () => {
    it('should generate password reset template with all fields', () => {
      const payload = {
        username: 'john_doe',
        resetUrl: 'https://example.com/reset?token=abc123',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template).toHaveProperty('subject');
      expect(template).toHaveProperty('html');
      expect(template.subject).toContain(productName);
      expect(template.subject).toContain('Réinitialiser');
    });

    it('should include username in password reset template', () => {
      const username = 'alice_smith';
      const payload = {
        username,
        resetUrl: 'https://example.com/reset?token=xyz',
        expiresInMinutes: 60,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain(`Bonjour ${username}`);
    });

    it('should include reset URL in password reset template', () => {
      const resetUrl = 'https://example.com/reset?token=secure_token_12345';
      const payload = {
        username: 'user',
        resetUrl,
        expiresInMinutes: 45,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain(resetUrl);
      expect(template.html).toContain('href');
    });

    it('should include expiration time in password reset template', () => {
      const expiresInMinutes = 120;
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain(`${expiresInMinutes}`);
      expect(template.html).toContain('expire');
    });

    it('should have proper HTML structure', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('<!doctype html>');
      expect(template.html).toContain('<html');
      expect(template.html).toContain('</html>');
      expect(template.html).toContain('<body');
      expect(template.html).toContain('</body>');
    });

    it('should include action button in password reset template', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('href');
      expect(template.html).toContain('Réinitialiser le mot de passe');
    });

    it('should include fallback link in password reset template', () => {
      const resetUrl = 'https://example.com/reset?token=abc';
      const payload = {
        username: 'user',
        resetUrl,
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('copiez ce lien');
      expect(template.html).toContain(resetUrl);
    });

    it('should handle special characters in username', () => {
      const payload = {
        username: 'user.name+tag@example.com',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('user.name+tag@example.com');
    });

    it('should handle long reset URLs', () => {
      const longUrl =
        'https://example.com/reset?token=' + 'a'.repeat(500) + '&lang=fr';
      const payload = {
        username: 'user',
        resetUrl: longUrl,
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain(longUrl);
    });

    it('should generate valid email subject for password reset', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.subject).toBeTruthy();
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.subject).toMatch(/password|mot de passe/i);
    });

    it('should use product name in password reset subject', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.subject).toContain(productName);
    });
  });

  describe('createWelcomeTemplate', () => {
    it('should generate welcome template with required fields', () => {
      const payload = {
        username: 'jane_doe',
        activationUrl: 'https://example.com/activate?token=xyz789',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template).toHaveProperty('subject');
      expect(template).toHaveProperty('html');
      expect(template.subject).toContain(productName);
      expect(template.subject).toContain('Bienvenue');
    });

    it('should include username in welcome template', () => {
      const username = 'bob_johnson';
      const payload = {
        username,
        activationUrl: 'https://example.com/activate',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(`Bonjour ${username}`);
    });

    it('should include activation URL when provided', () => {
      const activationUrl = 'https://example.com/activate?token=verify123';
      const payload = {
        username: 'user',
        activationUrl,
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(activationUrl);
      expect(template.html).toContain('Activer');
    });

    it('should work without activation URL', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template).toHaveProperty('subject');
      expect(template).toHaveProperty('html');
      expect(template.html).toBeTruthy();
    });

    it('should have proper HTML structure for welcome', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain('<!doctype html>');
      expect(template.html).toContain('<html');
      expect(template.html).toContain('</html>');
      expect(template.html).toContain('<body');
      expect(template.html).toContain('</body>');
    });

    it('should include product name in welcome email body', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(productName);
    });

    it('should include call to action in welcome template', () => {
      const payload = {
        username: 'user',
        activationUrl: 'https://example.com/activate',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain('Activer');
    });

    it('should handle special characters in username', () => {
      const payload = {
        username: 'user+special.char@example.com',
        activationUrl: 'https://example.com/activate',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain('user+special.char@example.com');
    });

    it('should handle long activation URLs', () => {
      const longUrl =
        'https://example.com/activate?token=' +
        'a'.repeat(500) +
        '&redirect=true';
      const payload = {
        username: 'user',
        activationUrl: longUrl,
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(longUrl);
    });

    it('should generate valid email subject for welcome', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.subject).toBeTruthy();
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.subject).toMatch(/bienvenue|welcome/i);
    });

    it('should use product name in welcome subject', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.subject).toContain(productName);
    });
  });

  describe('Different product names', () => {
    it('should use different product names in templates', () => {
      const customFactory = new EmailTemplateFactory('My Custom App');

      const welcomeTemplate = customFactory.createWelcomeTemplate({
        username: 'user',
      });

      const resetTemplate = customFactory.createPasswordResetTemplate({
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      });

      expect(welcomeTemplate.html).toContain('My Custom App');
      expect(welcomeTemplate.subject).toContain('My Custom App');
      expect(resetTemplate.html).toContain('My Custom App');
      expect(resetTemplate.subject).toContain('My Custom App');
    });

    it('should handle product names with special characters', () => {
      const specialFactory = new EmailTemplateFactory("Let's Event!");

      const welcomeTemplate = specialFactory.createWelcomeTemplate({
        username: 'user',
      });

      expect(welcomeTemplate.html).toContain("Let's Event!");
      expect(welcomeTemplate.subject).toContain("Let's Event!");
    });
  });

  describe('Template consistency', () => {
    it('should return object with subject and html properties', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(Object.keys(template).sort()).toEqual(['html', 'subject']);
    });

    it('should always return non-empty subject', () => {
      const resetTemplate = factory.createPasswordResetTemplate({
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      });

      const welcomeTemplate = factory.createWelcomeTemplate({
        username: 'user',
      });

      expect(resetTemplate.subject.length).toBeGreaterThan(0);
      expect(welcomeTemplate.subject.length).toBeGreaterThan(0);
    });

    it('should always return non-empty HTML', () => {
      const resetTemplate = factory.createPasswordResetTemplate({
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      });

      const welcomeTemplate = factory.createWelcomeTemplate({
        username: 'user',
      });

      expect(resetTemplate.html.length).toBeGreaterThan(0);
      expect(welcomeTemplate.html.length).toBeGreaterThan(0);
    });
  });

  describe('Email styling', () => {
    it('password reset template should have responsive design indicators', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('viewport');
      expect(template.html).toContain('meta');
    });

    it('welcome template should have responsive design indicators', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain('viewport');
      expect(template.html).toContain('meta');
    });
  });
});

describe('WelcomeTemplate', () => {
  let template: WelcomeTemplate;
  const productName = 'Event Thunder';

  beforeEach(() => {
    template = new WelcomeTemplate(productName);
  });

  it('should create welcome template independently', () => {
    const result = template.create({
      username: 'testuser',
      activationUrl: 'https://example.com/activate',
    });

    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
  });

  it('should work without activationUrl', () => {
    const result = template.create({
      username: 'testuser',
    });

    expect(result.subject).toContain('Bienvenue');
    expect(result.html).toContain('testuser');
  });
});

describe('PasswordResetTemplate', () => {
  let template: PasswordResetTemplate;
  const productName = 'Event Thunder';

  beforeEach(() => {
    template = new PasswordResetTemplate(productName);
  });

  it('should create password reset template independently', () => {
    const result = template.create({
      username: 'testuser',
      resetUrl: 'https://example.com/reset?token=abc',
      expiresInMinutes: 30,
    });

    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
  });

  it('should include all required information', () => {
    const result = template.create({
      username: 'john',
      resetUrl: 'https://example.com/reset?token=xyz',
      expiresInMinutes: 60,
    });

    expect(result.html).toContain('john');
    expect(result.html).toContain('https://example.com/reset?token=xyz');
    expect(result.html).toContain('60');
  });
});
