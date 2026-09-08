import { resolveClientAddressUseCase } from '../resolve-client-address.use-case';

describe('resolveClientAddressUseCase', () => {
    it('keeps an IPv4 address as it stands', () => {
        expect(resolveClientAddressUseCase('203.0.113.7')).toBe('203.0.113.7');
    });

    it('trims the address before it reads it', () => {
        expect(resolveClientAddressUseCase('  203.0.113.7  ')).toBe('203.0.113.7');
    });

    it('unwraps an IPv4 address that arrives in its mapped IPv6 form', () => {
        expect(resolveClientAddressUseCase('::ffff:203.0.113.7')).toBe('203.0.113.7');
    });

    it('counts an IPv6 client by its network of 64 bits', () => {
        expect(resolveClientAddressUseCase('2001:db8:1234:5678:9abc:def0:1234:5678'))
            .toBe('2001:db8:1234:5678::/64');
    });

    it('gives one tracker to two addresses of the same network of 64 bits', () => {
        const first = resolveClientAddressUseCase('2001:db8:1234:5678::1');
        const second = resolveClientAddressUseCase('2001:db8:1234:5678:ffff:ffff:ffff:ffff');

        expect(first).toBe(second);
    });

    it('gives two trackers to two addresses of different networks', () => {
        const first = resolveClientAddressUseCase('2001:db8:1234:5678::1');
        const second = resolveClientAddressUseCase('2001:db8:1234:9999::1');

        expect(first).not.toBe(second);
    });

    it('expands the compressed groups of an IPv6 network', () => {
        expect(resolveClientAddressUseCase('2001:db8::1')).toBe('2001:db8:0:0::/64');
    });

    it('groups every unparsable address under one tracker', () => {
        expect(resolveClientAddressUseCase('not-an-address')).toBe('unknown');
    });

    it('groups an empty address under the unknown tracker', () => {
        expect(resolveClientAddressUseCase('   ')).toBe('unknown');
    });

    it('groups an absent address under the unknown tracker', () => {
        expect(resolveClientAddressUseCase(undefined)).toBe('unknown');
    });

    it('groups a non-string address under the unknown tracker', () => {
        expect(resolveClientAddressUseCase(42)).toBe('unknown');
    });
});
