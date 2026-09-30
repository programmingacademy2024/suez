SUEZ PROGRAMMING ACADEMY

Structure
- index.html: homepage, design preserved from the previous version.
- navbar.html: one shared sticky navbar loaded by every page.
- pages/courses.html: learning tracks and levels.
- pages/course.html: course details and ENROLL NOW -> Google Form.
- pages/register.html: registration information page; no login/account system.
- pages/about.html and pages/contact.html: informational pages.
- data/courses.json: all academy courses.
- data/tracks.json: main learning tracks and additional programs.
- data/translations/en.json + ar.json: interface translations.
- js/config.js: Google Form configuration.
- js/app.js: shared navigation, language, course and registration logic.

Google Form
The existing Google Form URL is preserved. To preselect the student's course, put the entry ID of the Google Forms "Select Course" question in js/config.js as courseEntryId.

Important
Run the website through a local web server (XAMPP/Live Server) because the shared navbar and JSON data use fetch().
