class Requirement {}

// Grade requirement for one course
class GradeRequirement extends Requirement {
  constructor(minGrade, course) {
    super();
    this.minGrade = minGrade;
    this.course = course;
  }

  toString() {
    return `(${this.minGrade * 100}% in ${this.course})`;
  }
}

// Logical AND of multiple requirements
class And extends Requirement {
  constructor(requirements) {
    super();
    this.requirements = requirements;
  }

  toString() {
    if (this.requirements.length === 0) {
        return [];
    }
    if (this.requirements.length === 1) {
      return this.requirements[0].toString(); // No need for AND if there's only one requirement
    }
    return `AND(${this.requirements.map(r => r.toString()).join(", ")})`;
  }
}

// Logical OR of multiple requirements
class Or extends Requirement {
  constructor(requirements) {
    super();
    this.requirements = requirements;
  }

  toString() {
    if (this.requirements.length === 0) {
        return [];
    }
    if (this.requirements.length === 1) {
      return this.requirements[0].toString(); // No need for OR if there's only one requirement
    }
    return `OR(${this.requirements.map(r => r.toString()).join(", ")})`;
  }
}

function splitOutsideParens(str, delimiters) {
    const parts = [];
    let depth = 0;
    let currentPart = "";

    // only split when depth is 0 i.e. outside of parentheses
    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === "(") {
            depth++;
            currentPart += char;
        } else if (char === ")") {
            depth--;
            currentPart += char;
        } else if (delimiters.includes(char) && depth === 0) {
            parts.push(currentPart.trim());
            currentPart = "";
        } else {
            currentPart += char;
        }
    }
    if (currentPart) {
        parts.push(currentPart.trim());
    }
    return parts;
}

function stringToRequirement(str) {
    if (!str) {
        return new And([]);
    }
    // only accounting for artsci or applied science
    const multipleSets = str.split("Prerequisite for Faculty of Applied Science and Engineering students:");
    const artsci = multipleSets[0];  // only artsci
    const andParts = splitOutsideParens(artsci, [",", ";"]);
    const andOrParts = andParts.map(part => { 
        const orParts = splitOutsideParens(part, ["/"]);
        const recurse = [];
        for (const orPart of orParts) {
            // match something starting with ( and ending with ) and has , or / or ; inside
            // use a group to capture text inside the parentheses
            const match = orPart.match(/^\((.*[,/;].*)\)$/);
            if (match) {
                const inner = match[1];
                recurse.push(stringToRequirement(inner));
            } else {
                recurse.push(orPart);
            }
        }
        return new Or(recurse); 
    });
    const andObject = new And(andOrParts);
    return andObject;
}
module.exports = { stringToRequirement };