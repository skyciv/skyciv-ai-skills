var creator = SVGCreator; //Create SVGCreator object
var input = SKYCIV_DESIGN.designConfig.getInput(); //Retrieve input from HTML form

var units = { //Default unit system
    F: 'kN',
    L: 'mm',
    W: 'kN/m'
};

if (SKYCIV_DESIGN.units.getCurrentUnitSystem() == 'imperial') { //Convert units to imperial if selected by user
    units.F = 'kip';
    units.L = 'in';
    units.W = 'kip/ft';
}

// Define graphic window size
var total_width = jQuery('#ui-div').width(); //Find pixel size of graphic window from HTML
var total_height = 0.6 * total_width;

// Initialise creator
creator.initialize({ total_height: total_height, total_width: total_width, center: true });


// Output Diagram
creator.endSVG();
var html = creator.getSVGHtml();
var ui_div = document.getElementById('ui-div');
ui_div.innerHTML = html;