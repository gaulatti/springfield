import { JSONLogger } from 'src/utils/logger';

describe('JSONLogger', () => {
  it('should log messages', () => {
    const logger = new JSONLogger('Test');
    expect(logger).toBeDefined();
    logger.log('test log');
    logger.warn('test warn');
    logger.error('test error');
    logger.debug('test debug');
    logger.verbose('test verbose');
    logger.sequelizeLog('test sequelize');
  });
});
