import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Stream } from 'src/models/stream.model';

@Module({
  imports: [SequelizeModule.forFeature([Stream])],
  exports: [SequelizeModule],
  providers: [],
})
export class DalModule {}
