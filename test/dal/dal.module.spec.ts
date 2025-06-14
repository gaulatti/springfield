import { Test } from '@nestjs/testing';
import { DalModule } from 'src/dal/dal.module';

describe('DalModule', () => {
  it('should compile without error', async () => {
    await expect(
      Test.createTestingModule({ imports: [DalModule] }).compile(),
    ).resolves.not.toThrow();
  });
});
