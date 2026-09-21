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
var font_size = 0.06 * total_height;

// Initialise creator
creator.initialize({ total_height: total_height, total_width: total_width, center: true });

//Draw Beam
creator.addRect({
    x: 0.1 * total_width,
    y: 0.6 * total_height,
    width: 0.8 * total_width,
    height: 0.05 * total_height,
    stroke: 'black',
    fill_color: '#d3d3d3'
})

//Beam Length Dimension Line
creator.dimLineDrawer({
    x1: 0.1 * total_width,
    y1: 0.75 * total_height,
    x2: 0.9 * total_width,
    y2: 0.75 * total_height,
    pos: "start",
    color: 'black',
    text: input.L + ' ' + units.L,
    text_size: font_size,
    arrow_size: font_size / 3
})

if(input.w != 0){
    let scaling_factor = input.w / 10;

    //Draw Distributed Load
    creator.addRect({
        x: 0.1 * total_width,
        y: 0.6 * total_height - scaling_factor * total_height,
        width: 0.8 * total_width,
        height: scaling_factor * total_height,
        stroke: 'green',
        fill_color: 'green',
        fill_opacity: '50%'
    });

    //Distributed Load Label
    creator.addText({
        x: 0.1 * total_width + 0.8 * total_width / 2,
        y: 0.6 * total_height - scaling_factor * total_height - 1.5 * font_size,
        font_size: font_size,
        text_value: input.w + ' ' + units.W,
        text_anchor: 'middle',
        fill_color: 'green'
    })

}

//Draw Support A
creator.addCircle({
    center_x: 0.1 * total_width,
    center_y: 0.65 * total_height + 0.00625 * total_width,
    radius: 0.00625 * total_width,
    stroke: 'black',
    fill_color: 'black'
})

//Support A - Triangle Left Side
creator.addLine({
    start_x: 0.1 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width,
    end_x: 0.1 * total_width - 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: 1.5
})

//Support A - Triangle Right Side
creator.addLine({
    start_x: 0.1 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width,
    end_x: 0.1 * total_width + 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: '1.5',
});

//Support A - Triangle Btm Side
creator.addLine({
    start_x: 0.1 * total_width - 0.0125 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    end_x: 0.1 * total_width + 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: '1.5',
});

//Draw Support B
creator.addCircle({
    center_x: 0.9 * total_width,
    center_y: 0.65 * total_height + 0.00625 * total_width,
    radius: 0.00625 * total_width,
    stroke: 'black',
    fill_color: 'black'
});

//Support B - Triangle Left Side
creator.addLine({
    start_x: 0.9 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width,
    end_x: 0.9 * total_width - 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: '1.5',
});

//Support B - Triangle Right Side
creator.addLine({
    start_x: 0.9 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width,
    end_x: 0.9 * total_width + 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: '1.5',
});

//Support B - Triangle Btm Side
creator.addLine({
    start_x: 0.9 * total_width - 0.0125 * total_width,
    start_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    end_x: 0.9 * total_width + 0.0125 * total_width,
    end_y: 0.65 * total_height + 0.0125 * total_width + 0.0175 * total_width,
    stroke: 'black',
    stroke_width: '1.5',
});

//Add label to diagram
creator.addText({
    x: 0.5 * total_width,
    y: 0.8 * total_height,
    text_value: 'LOAD DIAGRAM',
    font_size: font_size,
    text_decoration: "underline",
    text_anchor: 'middle',
    fill_color: 'black'
})

// Output Diagram
creator.endSVG();
var html = creator.getSVGHtml();
var ui_div = document.getElementById('ui-div');
ui_div.innerHTML = html;