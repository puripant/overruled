const width = 700;
const height = 1300;
const margin = { left: 250, right: 250, top: 50, bottom: 20 };
const cell_size = 10;

const date_scale = d3.scaleTime()
  .domain([new Date(1800, 0, 1), new Date(2050, 0, 1)])
  .range([0, width]);
const x_scale = d3.scaleLinear()
  .domain([0, width/cell_size*2])
  .range([3, width]);
const y_scale = d3.scaleLinear()
  .domain([0, height/cell_size])
  .range([0, height]);
const freq_scale = d3.scaleLinear()
  .domain([0, height/cell_size + 10])
  .range([0, height]);
const color_scale = d3.scaleOrdinal(d3.schemeTableau10)
  // .domain([9, 10]);

const svg = d3.select('#chart')
  .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
const t = svg.transition().duration(750);

let names = [];
let cells = [];
let draw = () => {
  svg.selectAll('.overruled')
      .data(names)
    .join(
      enter => enter.append('text'),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'overruled')
      .text(d => d.overruled)
      .attr('text-anchor', 'end')
      .attr('fill', d => color_scale(d.type))
      .attr('y', (d, i) => (i+1) * cell_size - 3)
    .transition(t)
      .delay(d => d.years/5)
      .attr('x', d => projections.x ? 0 : date_scale(date_from_text(d.overruled_year)))
      .style('opacity', () => projections.y ? 0 : 1);

  svg.selectAll('.overruling')
      .data(names)
    .join(
      enter => enter.append('text'),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'overruling')
      .text(d => d.overruling)
      .attr('text-anchor', 'begin')
      .attr('fill', d => color_scale(d.type))
      .attr('y', (d, i) => (i+1) * cell_size - 3)
    .transition(t)
      .delay(d => d.years/5)
      .attr('x', d => projections.x ? 0 : (date_scale(date_from_text(d.overruling_year)) + cell_size))
      .style('opacity', () => (projections.x || projections.y) ? 0 : 1);

  svg.selectAll('.cell')
      .data(cells)
    .join(
      enter => enter.append("rect")
        .call(enter => enter.append("svg:title")
          .text(d => `${d.overruled} in ${d.overruled_year.getFullYear()} overruled by ${d.overruling} in ${d.overruling_year.getFullYear()} (${d.overruling_year.getFullYear()-d.overruled_year.getFullYear()} years)`)
        ),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'cell')
      .attr('width', cell_size/2 - 1)
      .attr('height', cell_size - 1)
      .attr('fill', d => color_scale(d.type))
      .on('mouseover', d => {
        svg.selectAll('rect.cell')
          .filter(dd => {
            if (projections['default']) return dd.overruled === d.overruled;
            if (projections['x']) return dd.date.getFullYear() === d.date.getFullYear();
            if (projections['y']) return dd.overruled === d.overruled;
          })
          .attr('fill', d => d3.rgb(color_scale(d.type)).darker(2))
      })
      .on('mouseout', () => {
        svg.selectAll('rect.cell')
          .attr('fill', d => color_scale(d.type));
      })
    .transition(t)
      .delay((d, i) => i/5)
      .attr('x', d => projections.x ? x_scale(d.date_order) : date_scale(d.date))
      .attr('y', d => projections.y ? freq_scale(d.stack) : y_scale(d.order));
  
  // Axes
  svg.select('.x-axis')
    .transition(t)
    .call(
      projections.x ? 
        d3.axisTop(x_scale) :
        d3.axisTop(date_scale)
          .ticks(d3.timeYear.every(20))
          .tickFormat(date => date.getFullYear())
    );
  
  svg.selectAll('.label').remove();
  if (projections.x) {
    svg.append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'start')
      .attr('x', width)
      .attr('dx', 15)
      .attr('y', -19)
      .text('years');
  }
  // } else {
  //   svg.append('text')
  //     .attr('class', 'label')
  //     .attr('text-anchor', 'end')
  //     .attr('x', 0)
  //     .attr('dx', -10)
  //     .attr('y', -19)
  //     .text('พ.ศ.');
  // }

  // Legend
  svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width-50},0)`);
  svg.select(".legend")
    .classed("dark-background", projections['y'])
    .call(d3.legendColor()
      .shapeWidth(cell_size-1)
      .shapeHeight(cell_size-1)
      .shapePadding(0)
      .scale(color_scale)
    );
}

const project_buttons = {
  default: d3.select('#project-button-default'),
  x: d3.select('#project-button-x'),
  y: d3.select('#project-button-y')
}
let projections = { default: true, x: false, y: false };
let project_along = axis => {
  if (!projections[axis]) {
    for (let key in projections) {
      projections[key] = false;
      project_buttons[key].classed("highlighted", false);
    }
    projections[axis] = true;
    project_buttons[axis].classed("highlighted", true);
    
    draw();
  }
}

let date_from_text = (text) => new Date(+text, 0, 1)

d3.csv('data.csv').then(data => {
  names = data;
  names_by_year = {};
  data.forEach((d, idx) => {
    let counter = 0;
    for(let date = date_from_text(d.overruled_year); date <= date_from_text(d.overruling_year); date.setFullYear(date.getFullYear() + 1)) {
      let year = date.getFullYear();
      if (!names_by_year[year]) {
        names_by_year[year] = [];
      }

      cells.push({
        type: d.type,
        overruled: d.overruled,
        overruling: d.overruling,
        overruled_year: date_from_text(d.overruled_year),
        overruling_year: date_from_text(d.overruling_year),
        date: date_from_text(year),
        date_order: counter++,
        order: idx,
        stack: names_by_year[year].length
      });

      names_by_year[year].push(d.overruled);
    }
    names[idx].years = (idx === 0) ? counter : (names[idx-1].years + counter);
  });

  svg.append('g')
    .attr("class", "x-axis")
    .attr("transform", "translate(0,-10)");
  // svg.append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", "translate(0,-10)");

  draw();
});