describe('Hello World Test - API Gateway', () => {
  it('should pass a simple hello world test', () => {
    const message = 'Hello World';
    expect(message).toBe('Hello World!');
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });
});
