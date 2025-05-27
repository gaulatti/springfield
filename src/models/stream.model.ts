import { Optional } from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

export interface StreamAttributes {
  uuid: string;
  pid: number;
  originalUrl: string;
  hlsUrl: string;
  startTime: Date;
  expiresAt: Date;
}

export type StreamCreationAttributes = Optional<StreamAttributes, 'uuid'>;

@Table({ tableName: 'streams', timestamps: false })
export class Stream
  extends Model<StreamAttributes, StreamCreationAttributes>
  implements StreamAttributes
{
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  uuid: string;

  @Column(DataType.INTEGER)
  pid: number;

  @Column(DataType.STRING)
  originalUrl: string;

  @Column(DataType.STRING)
  hlsUrl: string;

  @Column(DataType.DATE)
  startTime: Date;

  @Column(DataType.DATE)
  expiresAt: Date;
}
