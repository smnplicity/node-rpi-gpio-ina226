import EventEmitter from "events";

import { openSync } from "i2c-bus";
import {
  CALIBRATION_REGISTER,
  CONFIGURATION_REGISTER,
  DIE_ID_REGISTER,
  MANUFACTOR_ID_REGISTER,
  INA226 as UnderlyingINA226,
} from "ina226";

interface Options {
  address: number;
  rShunt: number;
  maxMa: number;
}

export interface Ina226ConnectInfo {
  manufacturerId: number;
  dieId: number;
  configuration: number;
}

export interface Ina226DataChange {
  busVoltage: number;
  shuntVoltage: number;
  current: number;
  power: number;
}

export default class INA226 extends EventEmitter {
  private options: Options;

  private dataChange: Ina226DataChange | null = null;

  constructor(opts: Options) {
    super();
    this.options = opts;
  }

  connect = () => {
    this.connectAsync();

    return this;
  };

  on = (
    channel: "connect" | "change" | "error" | "debug",
    listener: (...args: any[]) => void
  ) => {
    super.on(channel, listener);

    return this;
  };

  private connectAsync = async () => {
    let ina: UnderlyingINA226;

    try {
      const i2cBus = openSync(1);

      ina = new UnderlyingINA226(
        i2cBus,
        this.options.address,
        this.options.rShunt
      );

      await ina.writeRegister(CONFIGURATION_REGISTER, 0x8000);
      await ina.writeRegister(CONFIGURATION_REGISTER, 0x4527);
      await ina.writeRegister(CALIBRATION_REGISTER, this.options.maxMa);

      const manufacturerId = await ina.readRegister(MANUFACTOR_ID_REGISTER);
      const dieId = await ina.readRegister(DIE_ID_REGISTER);
      const configuration = await ina.readRegister(CONFIGURATION_REGISTER);

      const connectInfo: Ina226ConnectInfo = {
        manufacturerId,
        dieId,
        configuration,
      };

      this.emit("connect", connectInfo);
    } catch (e) {
      this.emit("error", e);
      return;
    }

    let errorReported = false;

    const poll = async () => {
      let wait = 1000;

      try {
        const busVoltage = this.round(await ina.readBusVoltage(), 2);
        const shuntVoltage = this.round(await ina.readShuntVoltage(), 5);

        const current = this.round(ina.calcCurrent(shuntVoltage), 2);
        const power = this.round(ina.calcPower(busVoltage, shuntVoltage), 2);

        const nextDataChange: Ina226DataChange = {
          busVoltage,
          shuntVoltage,
          current,
          power,
        };

        if (
          JSON.stringify(this.dataChange) !== JSON.stringify(nextDataChange)
        ) {
          this.dataChange = nextDataChange;

          this.emit("change", this.dataChange);
        }

        errorReported = false;
      } catch (e) {
        if (!errorReported) {
          errorReported = true;

          this.emit("error", e);
        }

        wait = 5000;
      }

      setTimeout(poll, wait);
    };

    poll();
  };

  private round = (value: number, precision: number) =>
    Number(value.toFixed(precision));
}
