export class Field {
  constructor() {
    this.name = '';
    this.description = '';
    this.bit_size = 0;
    this.bit_offset = 0;
    this.default_value = 0;
    this.permissions = '';
  }
}

export class Fieldset {
  constructor() {
    this.name = '';
    this.description = '';
    this.fields = [];
  }
}

export class Register {
  constructor() {
    this.name = '';
    this.description = '';
    this.byte_offset = 0;
    this.byte_size = 0;
    this.fieldset = undefined;
  }
}

export class Core {
  constructor() {
    this.name = '';
    this.description = '';
    this.byte_size = 0;
    /** @type {Register} */
    this.registers = [];
    this.fieldsets = [];
  }
}