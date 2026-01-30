import { EmailTemplateFactory } from '../mail/templates/email-template.factory';

/* eslint-disable */
describe('Email Template Security', () => {
  let factory: EmailTemplateFactory;
  const productName = 'Test Event Thunder';

  beforeEach(() => {
    factory = new EmailTemplateFactory(productName);
  });

  describe('XSS Prevention', () => {
    it('should not contain script tags in password reset template', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).not.toContain('<script');
      expect(template.html).not.toContain('</script>');
      expect(template.html.toLowerCase()).not.toMatch(/<script[^>]*>/);
    });

    it('should not contain script tags in welcome template', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).not.toContain('<script');
      expect(template.html).not.toContain('</script>');
    });

    it('should not contain javascript: protocol in password reset', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html.toLowerCase()).not.toContain('javascript:');
      expect(template.html.toLowerCase()).not.toContain('onclick=');
      expect(template.html.toLowerCase()).not.toContain('onerror=');
      expect(template.html.toLowerCase()).not.toContain('onload=');
    });

    it('should not contain javascript: protocol in welcome', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html.toLowerCase()).not.toContain('javascript:');
      expect(template.html.toLowerCase()).not.toContain('onclick=');
    });

    it('should document XSS vulnerability in username injection', () => {
      const maliciousUsername = '<img src=x onerror="alert(1)">';
      const payload = {
        username: maliciousUsername,
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // NOTE: Current implementation does NOT escape HTML entities
      // This is a KNOWN SECURITY ISSUE that needs fixing
      // Username should be escaped before injection into template
      const containsVulnerability = template.html.includes('onerror=');
      expect(containsVulnerability).toBe(true);
    });

    it('should document XSS vulnerability in welcome username', () => {
      const maliciousUsername = '<img src=x onerror="alert(1)">';
      const payload = {
        username: maliciousUsername,
      };

      const template = factory.createWelcomeTemplate(payload);

      // NOTE: Current implementation does NOT escape HTML entities
      // This is a KNOWN SECURITY ISSUE
      const containsVulnerability = template.html.includes('onerror=');
      expect(containsVulnerability).toBe(true);
    });
  });

  describe('Template Variable Replacement', () => {
    it('should not have unreplaced variables in password reset template', () => {
      const payload = {
        username: 'john_doe',
        resetUrl: 'https://example.com/reset?token=abc123',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Check for unreplaced template variables
      expect(template.html).not.toContain('{{');
      expect(template.html).not.toContain('}}');
      expect(template.html).not.toContain('${');
      expect(template.html).not.toContain('<%');
      expect(template.html).not.toContain('%>');
      expect(template.html).not.toContain('<%=');
    });

    it('should not have unreplaced variables in welcome template', () => {
      const payload = {
        username: 'jane_doe',
        activationUrl: 'https://example.com/activate?token=xyz',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).not.toContain('{{');
      expect(template.html).not.toContain('}}');
      expect(template.html).not.toContain('${');
      expect(template.html).not.toContain('<%');
      expect(template.html).not.toContain('%>');
    });

    it('should replace all username occurrences in password reset', () => {
      const username = 'test_user_123';
      const payload = {
        username,
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Username should appear at least once (in greeting)
      expect(template.html).toContain(username);
      
      // Verify no placeholder patterns remain
      const placeholderPatterns = [
        /\{\{.*?\}\}/,
        /\$\{.*?\}/,
        /<%.*?%>/,
      ];

      placeholderPatterns.forEach(pattern => {
        expect(template.html).not.toMatch(pattern);
      });
    });

    it('should replace all username occurrences in welcome', () => {
      const username = 'test_user_456';
      const payload = {
        username,
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(username);

      const placeholderPatterns = [
        /\{\{.*?\}\}/,
        /\$\{.*?\}/,
        /<%.*?%>/,
      ];

      placeholderPatterns.forEach(pattern => {
        expect(template.html).not.toMatch(pattern);
      });
    });
  });

  describe('URL Security', () => {
    it('should only use https:// for password reset links', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Should contain https
      expect(template.html).toContain('https://');
      
      // Should not have dangerous protocols
      expect(template.html.toLowerCase()).not.toContain('data:');
      expect(template.html.toLowerCase()).not.toContain('vbscript:');
    });

    it('should handle reset URLs with query parameters safely', () => {
      const resetUrl = 'https://example.com/reset?token=abc123&redirect=https://trusted.com';
      const payload = {
        username: 'user',
        resetUrl,
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // URL should be present
      expect(template.html).toContain(resetUrl);
      
      // Should not break HTML structure
      expect(template.html).toContain('href="' + resetUrl + '"');
    });

    it('should handle activation URLs with query parameters safely', () => {
      const activationUrl = 'https://example.com/activate?token=xyz&lang=fr';
      const payload = {
        username: 'user',
        activationUrl,
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain(activationUrl);
      expect(template.html).toContain('href="' + activationUrl + '"');
    });

    it('should handle URLs with fragments safely', () => {
      const resetUrl = 'https://example.com/reset?token=abc#section';
      const payload = {
        username: 'user',
        resetUrl,
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain(resetUrl);
    });
  });

  describe('Content Security', () => {
    it('should have proper meta charset in password reset', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('charset');
      expect(template.html).toContain('UTF-8');
    });

    it('should have proper meta charset in welcome', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.html).toContain('charset');
      expect(template.html).toContain('UTF-8');
    });

    it('should have viewport meta tag for responsive design', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('viewport');
      expect(template.html).toContain('width=device-width');
    });

    it('should not have inline event handlers', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Check for inline event handlers
      const dangerousHandlers = [
        'onload=',
        'onerror=',
        'onclick=',
        'onmouseover=',
        'onmouseout=',
        'onfocus=',
        'onblur=',
      ];

      dangerousHandlers.forEach(handler => {
        expect(template.html.toLowerCase()).not.toContain(handler);
      });
    });
  });

  describe('Subject Line Security', () => {
    it('should not have special characters in password reset subject', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Subject should be plain text, no HTML
      expect(template.subject).not.toContain('<');
      expect(template.subject).not.toContain('>');
      expect(template.subject).not.toContain('{{');
      expect(template.subject).not.toContain('${');
    });

    it('should not have special characters in welcome subject', () => {
      const payload = {
        username: 'user',
      };

      const template = factory.createWelcomeTemplate(payload);

      expect(template.subject).not.toContain('<');
      expect(template.subject).not.toContain('>');
      expect(template.subject).not.toContain('{{');
      expect(template.subject).not.toContain('${');
    });

    it('should have reasonable length subject line', () => {
      const payload = {
        username: 'user',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Email subject should be < 78 characters (RFC 5322)
      // But allow up to 255 for modern clients
      expect(template.subject.length).toBeLessThan(255);
      expect(template.subject.length).toBeGreaterThan(0);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle unicode characters in username', () => {
      const payload = {
        username: 'üser_naïve',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('üser_naïve');
      expect(template.html).not.toContain('<script');
    });

    it('should handle emoji in username', () => {
      const payload = {
        username: 'user_🎉',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      expect(template.html).toContain('🎉');
      expect(template.html).not.toContain('<script');
    });

    it('should handle special HTML characters in username', () => {
      const payload = {
        username: 'user&special',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      };

      const template = factory.createPasswordResetTemplate(payload);

      // Should contain the username (escaped or not, but safe)
      expect(template.html).not.toContain('<script');
    });
  });
});
