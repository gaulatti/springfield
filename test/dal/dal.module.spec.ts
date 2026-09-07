import { MODULE_METADATA } from '@nestjs/common/constants';
import { DalModule } from 'src/dal/dal.module';

describe('DalModule', () => {
  it('should declare and export its Sequelize feature module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, DalModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, DalModule);

    expect(imports).toHaveLength(1);
    expect(exports).toHaveLength(1);
  });
});
