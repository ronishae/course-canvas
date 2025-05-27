// npm init -y
// npm install axios cheerio

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { stringToRequirement } = require('./AST.js'); 

const courses = {};
const unmatched = [];

// courseRow is the Cheerio object of the course row
// Course is the text of the unparsed title with code, length, and name
function parseCourseTitle(courseRow, course) {
    
    try {
        const match = course.match(/^([A-Z]{3}\d{3})([A-Z]\d)\s*-\s*(.+)$/);

        if (!match) {
            throw new Error('Format does not match');
        }

        const [, code, length, name] = match;
        courses[code] = {};
        courses[code].length = length;
        courses[code].name = name;
        return code;
    } catch (error) {
        console.log('Error parsing course title: ', course);
        unmatched.push(course);
        return null;
    }
}

// code is the course code which is parsed from the title
function parseCourseHours($, courseRow, code) {
    try {
        const hours = $(courseRow).find('.views-field-field-hours.views-field > .field-content')?.first().text().trim();
        courses[code].hours = hours;
    } catch (error) {
        console.log('Error parsing course hours: ', code);
    }
}

// description will be a list of paragraphs
function parseCourseDescription($, courseRow, code) {
    try {
        const description = $(courseRow).find('.views-field-body > .field-content')?.first();
        // Get a list of all paragraphs
        const paragraphs = [];
        description.find('p').each((index, paragraph) => {
            paragraphs.push($(paragraph).text().trim());
        });

        courses[code].description = paragraphs;
    } catch (error) {
        console.log('Error parsing course description: ', code);
    }
}


// for now just put the full text, but later will split it based on the , / and ; and grade requirements, etc
// also look for a strong tag and split it up into two because that usually 
// indicates different requirements based on faculty
// prerequisite
    // Prerequisite for Faculty of Applied Science and Engineering students:
function parseCoursePrerequisite($, courseRow, code) {
    try {
        const prerequisiteFull = $(courseRow).find('.views-field-field-prerequisite > .field-content')?.first().text().trim();

        courses[code].prerequisite = prerequisiteFull;
    } catch (error) {
        console.log('Error parsing course prerequisite: ', code);
    }
}

function parseCourseExclusion($, courseRow, code) {
    try {
        const exclusionFull = $(courseRow).find('.views-field-field-exclusion > .field-content')?.first().text().trim();

        courses[code].exclusion = exclusionFull;
    } catch (error) {
        console.log('Error parsing course exclusion: ', code);
    }
}

function parseCourseRecommended($, courseRow, code) {
    try {
        const recommendedFull = $(courseRow).find('.views-field-field-recommended > .field-content')?.first().text().trim();

        courses[code].recommended = recommendedFull;
    } catch (error) {
        console.log('Error parsing course recommended: ', code);
    }
}

function parseCourseBreadth($, courseRow, code) {
    try {
        const breadth = $(courseRow).find('.views-field-field-breadth-requirements > .field-content')?.first().text().trim();
        // find the first number in the string
        const match = breadth.match(/(\d+)/);
        if (match) {
            const number = match[1];
            courses[code].breadth = number;
        }
        else {
            courses[code].breadth = null;
        }

    } catch (error) {
        console.log('Error parsing course breadth: ', code);
    }
}

async function scrapePage(baseUrl, pageNumber) {
    const url = `${baseUrl}&page=${pageNumber}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const rows = $('div.view-content div.views-row');
    rows.each((index, courseRow) => {
        const course = $(courseRow).find('h3 > div')?.first().text().trim();
        if (!course) return;  // Skip if course title is not found

        const code = parseCourseTitle(courseRow, course);
        if (!code) return;  // Skip further parsing if parseCourseTitle returns null
        parseCourseHours($, courseRow, code);
        parseCourseDescription($, courseRow, code);
        parseCoursePrerequisite($, courseRow, code);
        parseCourseExclusion($, courseRow, code);
        parseCourseRecommended($, courseRow, code);
        parseCourseBreadth($, courseRow, code);
    });
}

async function scrapeAllPages(baseUrl, totalPages) {
    for (let i = 0; i < totalPages; i++) {
        await scrapePage(baseUrl, i);
    }
    fs.writeFile('courses.json', JSON.stringify(courses, null, 2, ), (err) => {
        if (err) {
            console.error('Error writing to file', err);
        } else {
            console.log('Courses data saved to courses.json');
        }
    });
}

// Run
(async () => {
    // This url uses page 0 as the first page
    const baseUrl = 'https://artsci.calendar.utoronto.ca/search-courses?course_keyword=CSC&field_section_value=All&field_prerequisite_value=&field_breadth_requirements_value=All';
    const totalPages = 3;
    // await scrapeAllPages(baseUrl, totalPages);

    // if needing to read the json:
    fs.readFile('courses.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file', err);
            return;
        }
        const loaded = JSON.parse(data);
        console.log(stringToRequirement(loaded['CSC384'].prerequisite).toString(debug=true));
    });

    // console.log(stringToRequirement('CSC110 / (CSC111, CSC112)').toString(debug=true));
    
})();