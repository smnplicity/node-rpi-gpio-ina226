# @node-rpi-gpio/ina226

A simple event based NodeJS module for reading current and power from an INA226.

## Installation

```
npm i @node-rpi-gpio/ina226
```

## Usage

### Subscribe to data change events

```
const ina226 = new INA226({ address: 0x40, rShunt: 0.1 })
  .on("error", (err: string | Error) => {
    // Log or display an error.
  })
  .on("change", (data: Ina226DataChange) => {

  })
  .connectAsync();
```
