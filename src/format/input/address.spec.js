// ISC, Copyright 2017 Jaco Greeff

const format = require('./address');

describe('format/input/address', () => {
  describe('format', () => {
    it('pads to H160 value', () => {
      expect(
        format('0x1234567890')
      ).to.equal('0x0000000000000000000000000000001234567890');
    });
  });
});
