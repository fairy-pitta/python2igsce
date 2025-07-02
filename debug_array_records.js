const { Converter } = require('./dist/converter');

const converter = new Converter();

const pythonCode = `class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord

path = [Point(1, 2), Point(3, 4)]
first_point_x = path[0].x`;

console.log('=== Python Code ===');
console.log(pythonCode);
console.log('\n=== Generated IGCSE Code ===');

converter.convert(pythonCode).then(result => {
    console.log(result.code);
    
    console.log('\n=== Analysis ===');
    console.log('Contains TYPE PointRecord?', result.code.includes('TYPE PointRecord'));
    console.log('Contains DECLARE path : ARRAY[1:2] OF PointRecord?', result.code.includes('DECLARE path : ARRAY[1:2] OF PointRecord'));
    console.log('Contains path[1].x ← 1?', result.code.includes('path[1].x ← 1'));
    console.log('Contains first_point_x ← path[1].x?', result.code.includes('first_point_x ← path[1].x'));
    console.log('Contains path[0].x (wrong)?', result.code.includes('path[0].x'));
}).catch(err => {
    console.error('Error:', err);
});