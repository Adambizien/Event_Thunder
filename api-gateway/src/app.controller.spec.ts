import { AppController } from './app.controller';

describe('AppController', () => {
  it('renvoie le healthcheck de la passerelle', () => {
    expect(new AppController().health()).toEqual({
      message: 'La passerelle API fonctionne',
    });
  });
});
