import { MODULE_METADATA } from '@nestjs/common/constants';
import { getModelToken, SequelizeModule } from '@nestjs/sequelize';
import { DalModule } from 'src/dal/dal.module';
import { Stream } from 'src/models/stream.model';

describe('DalModule', () => {
  it('registers the Stream feature and exports Sequelize without opening a database', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, DalModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, DalModule);

    expect(imports).toHaveLength(1);
    expect(imports[0].module).toBe(SequelizeModule);
    expect(imports[0].providers.map((provider) => provider.provide)).toEqual([
      getModelToken(Stream),
    ]);
    expect(exports).toEqual([SequelizeModule]);
  });
});
