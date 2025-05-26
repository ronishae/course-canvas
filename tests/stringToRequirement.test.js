const { stringToRequirement } = require('../AST'); 

// npm test tests/stringToRequirement.test.js
test('handles empty string', () => {
    const result = stringToRequirement('').toString();
    expect(result).toEqual('');
});

test('handles single requirement', () => {
    const result = stringToRequirement('CSC110').toString();
    expect(result).toEqual('CSC110');
});

test('handles AND requirements', () => {
    const result = stringToRequirement('CSC110, CSC111; CSC112').toString();
    expect(result).toEqual('AND(CSC110, CSC111, CSC112)');
});

test('handles OR requirements', () => {
    const result = stringToRequirement('CSC110 / CSC111').toString();
    expect(result).toEqual('OR(CSC110, CSC111)');
});

test('handles nested requirements', () => {
    const result = stringToRequirement('CSC110 / (CSC111, CSC112)').toString();
    expect(result).toEqual('OR(CSC110, AND(CSC111, CSC112))');
});

test('handles deep nesting', () => {
    const result = stringToRequirement('A / (B, (C, (D / (E1, E2)), (F, G)), H)').toString();
    expect(result).toEqual('OR(A, AND(B, AND(C, OR(D, AND(E1, E2)), AND(F, G)), H))');
});

test('respects non list parentheses', () => {
    const result = stringToRequirement('CSC110 (ignore this), (CSC111 / CSC112)').toString();
    expect(result).toEqual('AND(CSC110 (ignore this), OR(CSC111, CSC112))');
});