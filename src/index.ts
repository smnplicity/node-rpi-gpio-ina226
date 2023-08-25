import EventEmitter from "events";

import { openSync } from "i2c-bus";
import { CONFIGURATION_REGISTER, INA226 as UnderlyingINA226 } from "ina226";

interface Options {
  address: number;
  rShunt: number;
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

  connectAsync = async () => {
    const i2cBus = openSync(1);

    const ina = new UnderlyingINA226(
      i2cBus,
      this.options.address,
      this.options.rShunt
    );

    try {
      await ina.writeRegister(CONFIGURATION_REGISTER, 0x4427);
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

    return this;
  };

  on = (
    channel: "change" | "error" | "debug",
    listener: (...args: any[]) => void
  ) => {
    this.on(channel, listener);

    return this;
  };

  private round = (value: number, precision: number) =>
    Number(value.toFixed(precision));
}
