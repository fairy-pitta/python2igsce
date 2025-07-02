class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord


path = [Point(1, 2), Point(3, 4)]
first_point_x = path[1].x