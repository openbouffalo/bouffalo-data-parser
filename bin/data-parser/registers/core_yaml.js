export class Field {
  constructor() {
    this.name = '';
    this.description = '';
    this.size_bits = 0;
    this.offset_bits = 0;
    this.reset_value = 0;
    this.access = '';
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
    this.offset_bytes = 0;
    this.size_bytes = 0;
    this.fieldset = undefined;
  }
}

export class Core {
  constructor() {
    this.name = '';
    this.description = '';
    this.size_bytes = 0;
    /** @type {Register} */
    this.registers = [];
    this.fieldsets = [];
  }
}