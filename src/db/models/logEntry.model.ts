import { prop, getModelForClass } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

export class ILogEntry extends TimeStamps {
  @prop({ required: true })
  public title!: string;

  @prop()
  public description?: string;

  @prop()
  public comment?: string;

  @prop({ default: 0, min: 0, max: 10 })
  public rating?: number;

  @prop()
  public image?: string;

  @prop({ required: true, min: -90, max: 90 })
  public latitude!: number;

  @prop({ required: true, min: -180, max: 180 })
  public longitude!: number;

  @prop({ required: true })
  public visitDate!: Date;
}

const LogEntry = getModelForClass(ILogEntry);
export default LogEntry;
