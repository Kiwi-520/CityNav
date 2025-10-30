[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|bank|atm|restaurant|hotel"](around:RADIUS,LAT,LON);
  node["public_transport"~"platform|stop_position"](around:RADIUS,LAT,LON);
  node["highway"="bus_stop"](around:RADIUS,LAT,LON);
  node["railway"="station"](around:RADIUS,LAT,LON);
);
out body;
