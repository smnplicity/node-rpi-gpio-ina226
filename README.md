# @node-rpi-gpio/ina226

A simple event based NodeJS module for reading current and power from an INA226.

## Installation

```
npm i @node-rpi-gpio/ina226
```

## Usage
### Options
address: The I2C address that is connected to the INA226.

rShunt: The shunt resistance value.

### Subscribe to data change events

```
import INA226, {
  Ina226ConnectInfo,
  Ina226DataChange,
} from "@node-rpi-gpio/ina226";

const ina226 = new INA226({ address: 0x40, rShunt: 0.1 })
  .on("connect", connectInfo: Ina226ConnectInfo => {
    console.log("Connected", connectInfo);
  })
  .on("error", (err: string | Error) => {
    // Log or display an error.
  })
  .on("change", (data: Ina226DataChange) => {
    console.log(data.power, "W");
    console.log(data.current, "A");
  })
  .connectAsync();
```
