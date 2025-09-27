// Mock pour react-native-maps sur web
const React = require('react');

const MapView = (props) => {
  return React.createElement('div', {
    style: { 
      flex: 1, 
      backgroundColor: '#f0f0f0', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: 300
    }
  }, 'Carte (Web Mode)');
};

const Marker = (props) => {
  return React.createElement('div', null, null);
};

const Circle = (props) => {
  return React.createElement('div', null, null);
};

module.exports = MapView;
module.exports.Marker = Marker;
module.exports.Circle = Circle;
module.exports.default = MapView;
