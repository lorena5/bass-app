(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Drums', createDrums());


  function createDrums() {
    var drumsKits = {
      Drums: [
        {
          name: 'tom1',
          label: 'Small Rack Tom',
          filename: 'sounds/drums/acoustic/small-rack-tom'
        }, {
          name: 'tom2',
          label: 'Big Rack Tom',
          filename: 'sounds/drums/acoustic/big-rack-tom'
        }, {
          name: 'tom3',
          label: 'Floor Tom',
          filename: 'sounds/drums/acoustic/floor-tom'
        }, {
          name: 'crash',
          label: 'Crash',
          filename: 'sounds/drums/acoustic/crash'
        }, {
          name: 'hihat-open',
          label: 'Hi-Hat Open',
          filename: 'sounds/drums/acoustic/hi-hat-open'
        }, {
          name: 'hihat',
          label: 'Hi-Hat Closed',
          filename: 'sounds/drums/acoustic/hi-hat-closed'
        }, {
          name: 'snare',
          label: 'Snare',
          filename: 'sounds/drums/acoustic/snare'
        }, {
          name: 'kick',
          label: 'Kick',
          filename: 'sounds/drums/acoustic/kick'
        }
      ],
      Percussions: [
        {
          name: 'clap',
          label: 'Clap',
          filename: 'sounds/percussion/clap_009'
        }, {
          name: 'tambourine',
          label: 'Tambourine',
          filename: 'sounds/percussion/tambourine_001'
        }, {
          name: 'maracas',
          label: 'Maracas',
          filename: 'sounds/drums/bongo/shaker_009'
        }, {
          name: 'cabasa',
          label: 'Cabasa',
          filename: 'sounds/drums/bongo/shaker_002'
        }, {
          name: 'bongo',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_001d'
        }, {
          name: 'djembe',
          label: 'Djembe',
          filename: 'sounds/drums/bongo/bongo_002c'
        }, {
          name: 'conga2',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_005d'
        }, {
          name: 'conga',
          label: 'Conga',
          filename: 'sounds/drums/bongo/bongo_006r'
        }
      ]
    };

    for (name in drumsKits) {
      var kit = drumsKits[name];
      kit.drumMap = {};
      kit.forEach(function(drum) {
        kit.drumMap[drum.name] = drum;
      });
    }
    return drumsKits;
  }

})();