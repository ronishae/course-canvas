const { stringToRequirement } = require('../AST'); 
test('handles empty string', () => {
    const result = stringToRequirement('').toString();
    expect(result).toEqual([]);
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

test('respects non list parentheses', () => {
    const result = stringToRequirement('CSC110 (ignore this), (CSC111 / CSC112)').toString();
    expect(result).toEqual('AND(CSC110 (ignore this), OR(CSC111, CSC112))');
});