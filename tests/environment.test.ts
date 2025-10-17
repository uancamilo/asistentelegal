import * as dotenv from 'dotenv';

dotenv.config();

describe('Environment Configuration', () => {
  it('should load DATABASE_URL from .env', () => {
    expect(process.env['DATABASE_URL']).toBeDefined();
    expect(process.env['DATABASE_URL']).toContain('postgresql://');
  });

  it('should load ADMIN_EMAIL from .env', () => {
    expect(process.env['ADMIN_EMAIL']).toBeDefined();
    expect(process.env['ADMIN_EMAIL']).toContain('@');
  });

  it('should load ADMIN_PASSWORD from .env', () => {
    expect(process.env['ADMIN_PASSWORD']).toBeDefined();
    expect(process.env['ADMIN_PASSWORD']?.length).toBeGreaterThan(0);
  });

  it('should load SECONDARY_ADMIN_PASSWORD from .env', () => {
    expect(process.env['SECONDARY_ADMIN_PASSWORD']).toBeDefined();
    expect(process.env['SECONDARY_ADMIN_PASSWORD']?.length).toBeGreaterThan(0);
  });

  it('should load EDITOR_PASSWORD from .env', () => {
    expect(process.env['EDITOR_PASSWORD']).toBeDefined();
    expect(process.env['EDITOR_PASSWORD']?.length).toBeGreaterThan(0);
  });
});
