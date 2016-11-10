(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('ReadOnlyStore', ReadOnlyStore)
    .value('ProjectLocalStore', ProjectLocalStore)
    .factory('projectManager', projectManager);


  function ReadOnlyStore(projectData) {
    this.readOnly = true;
    this.projectData = projectData;
  }

  ReadOnlyStore.prototype.getProject = function(projectId) {
    return {
      id: 1,
      name: this.projectData.name,
      tracks: this.projectData.tracks,
      sections: this.projectData.index,
      playlists: this.projectData.playlists || []
    };
  }

  ReadOnlyStore.prototype.getSection = function(sectionId) {
    var index = this.projectData.index.findIndex(byId(sectionId));
    var section = this.projectData.sections[index];
    section.name = this.projectData.index[index].name;
    section.id = this.projectData.index[index].id;
    return section;
  };



  function ProjectLocalStore() {
    this.readOnly = false;
    this.PROJECTS_KEY = 'bd.projects';
    this.projects = this.projectsList();
  }

  function projectKey(projectId) {
    return 'bd.project.{0}'.format(projectId);
  }
  function playlistsKey(projectId) {
    return 'bd.playlists.{0}'.format(projectId);
  }
  function sectionKey(projectId, sectionId) {
    return 'bd.section.{0}.{1}'.format(projectId, sectionId);
  }

  ProjectLocalStore.prototype._updateProjectsOrder = function(latestProjectId) {
    var index = this.projects.findIndex(byId(latestProjectId));
    if (index !== -1) {
      var item = this.projects.splice(index, 1)[0];
      this.projects.splice(0, 0, item);
      var data = JSON.stringify(this.projects);
      localStorage.setItem(this.PROJECTS_KEY, data);
    }
  };

  ProjectLocalStore.prototype.projectsList = function() {
    var data = localStorage.getItem(this.PROJECTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  };


  ProjectLocalStore.prototype.getProject = function(projectId) {
    var projectConfig = JSON.parse(localStorage.getItem(projectKey(projectId)));
    var playlists = JSON.parse(localStorage.getItem(playlistsKey(projectId))) || [];

    this.project = {
      id: projectId,
      name: projectConfig.name,
      sections: projectConfig.sections,
      tracks: projectConfig.tracks,
      playlists: playlists
    };
    this._updateProjectsOrder(projectId);
    return this.project;
  };

  ProjectLocalStore.prototype.createProject = function(projectName) {
    console.log('Initialize project: '+projectName);
    // generate new unique project id
    var id = this.projects.reduce(function(value, projectRecord) {
      return projectRecord.id >= value? projectRecord.id+1 : value;
    }, 1);
    var id = generateItemId(this.projects);
    this.project = {
      name: projectName,
      id: id,
      sections: [],
      tracks: []
    };
    this.projects.splice(0, 0, {
      id: this.project.id,
      name: this.project.name
    });

    var data = JSON.stringify(this.projects);
    localStorage.setItem(this.PROJECTS_KEY, data);
    return this.project;
  };


  ProjectLocalStore.prototype.saveProjectConfig = function(tracksInfo, sectionsIndex) {
    var projectId = this.project.id;
    console.log('ProjectLocalStore.saveProjectConfig: '+projectKey(projectId));
    this.project.tracks = tracksInfo;
    
    // filter only already saved sections
    this.project.sections = sectionsIndex.filter(function(record) {
      return this.project.sections.some(function(s) {
        return s.id === record.id;
      });
    }, this);
    var data = JSON.stringify(this.project, function(k, v) {
      if (k === 'playlists') {
        return undefined;
      }
      return v;
    });
    console.log(data);
    localStorage.setItem(projectKey(projectId), data);
  };


  ProjectLocalStore.prototype.saveSection = function(sectionId, sectionName, serializedData) {
    var key = sectionKey(this.project.id, sectionId);
    console.log('ProjectLocalStore.saveSection: '+key);

    var sectionIndexExists = this.project.sections.some(function(s) {
      return s.id === sectionId;
    });
    if (!sectionIndexExists) {
      this.project.sections.push({
        id: sectionId,
        name: sectionName
      });
    }
    localStorage.setItem(key, serializedData);
  };

  ProjectLocalStore.prototype.getSection = function(sectionId) {
    if (!this.project) {
      return;
    }
    var key = sectionKey(this.project.id, sectionId);
    var data = localStorage.getItem(key);
    if (data) {
      data = JSON.parse(data);
      data.id = sectionId;
      return data;
    }
  };

  ProjectLocalStore.prototype.deleteSection = function(sectionId) {
    var key = sectionKey(this.project.id, sectionId);
    localStorage.removeItem(key);
  };

  ProjectLocalStore.prototype.savePlaylists = function(playlists) {
    var key = playlistsKey(this.project.id);
    console.log('ProjectLocalStore.savePlaylists: '+key);
    localStorage.setItem(key, JSON.stringify(playlists));
  };

  ProjectLocalStore.prototype._projectData = function() {
    var projectId = this.project.id;
    var projectConfig = JSON.parse(localStorage.getItem(projectKey(projectId)));
    var playlists = JSON.parse(localStorage.getItem(playlistsKey(projectId))) || [];
    var sections = projectConfig.sections.map(function(sectionIndex) {
      var key = sectionKey(projectId, sectionIndex.id);
      return JSON.parse(localStorage.getItem(key));
    });
    var data = {
      name: projectConfig.name,
      index: projectConfig.sections,
      tracks: projectConfig.tracks,
      playlists: playlists,
      sections: sections
    };
    return data;
  }


  // function generateItemId(list) {
  //   var newId = Math.max.apply(
  //     null,
  //     list.map(function(item) {
  //       return item.id;
  //     })
  //   ) + 1;
  //   return Math.max(newId, 1);
  // }

  function generateItemId(list) {
    return list.reduce(
      function(value, item) {
        return item.id >= value? item.id+1 : value;
      }, 1
    );
  }

  function byId(id) {
    return function(item) {
      return item.id === id;
    }
  }

  function projectManager($http, $timeout, $q, Observable, context,
      BassSection, DrumSection, Bass, Drums, BassTrackSection, DrumTrackSection) {

    var idCouter = {};
    var compressors = {};

    function ProjectManager() {
      this.store = new ProjectLocalStore();
      Observable.call(this, [
        "projectLoaded", "playlistLoaded",
        "sectionLoaded", "sectionDeleted", "sectionCreated"
      ]);
    }
    ProjectManager.prototype = Object.create(Observable.prototype);

    ProjectManager.prototype.addTrack = function(track) {
      if (angular.isUndefined(idCouter[track.type])) {
        idCouter[track.type] = 0;
      }
      track.id = track.type+'_'+idCouter[track.type];
      // console.log(track.kit)
      if (track.kit === 'Standard') {
        track.kit = 'Drums';
        track.name = track.kit;
      } else if (track.kit === 'Bongo') {
        track.kit = 'Percussions';
        track.name = track.kit;
      }

      track.instrument = (track.type === 'bass')? new Bass(track) : Drums[track.kit];

      var compressor = compressors[track.type];
      if (!compressor) {
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -35;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        // compressor.release.value = 0.25;
        compressors[track.type] = compressor;

        // avoid initial fade-in caused by compressor by playing
        // a short inaudible audio through it
        var oscillator = context.createOscillator();
        oscillator.frequency.value = 22500;
        oscillator.connect(compressor);
        compressor.connect(context.destination);
        oscillator.start();
        setTimeout(function() {
          oscillator.stop();
        }, 50);
      }

      track.audio = context.createGain();
      if (track.volume) {
        track.audio.gain.value = track.volume.muted? 0.0001 : track.volume.value;
        track._volume = track.volume.value;
      }
      // track.audio.connect(context.destination);
      track.audio.connect(compressor);

      var index = this.project.tracks.length;
      this.project.tracks.forEach(function(t, i) {
        if (t.type === track.type) {
          index = i+1;
        }
      });
      this.project.tracks.splice(index, 0, track);
      this.project.tracksMap[track.id] = track;
      idCouter[track.type] += 1;
      // TODO: add track for every existing section, or do it lazy
    };

    ProjectManager.prototype.createProject = function(tracks) {
      idCouter = {};
      compressors = {};
      this.store.project = null;
      this.project = {
        sections: [],
        tracks: [],
        tracksMap: {},
        playlists: []
      };
      this.createPlaylist();
      tracks.forEach(this.addTrack.bind(this));
      this.dispatchEvent('projectLoaded', this.project);
      return this.project;
    };

    ProjectManager.prototype.loadProject = function(projectId) {
      idCouter = {};
      compressors = {};
      var projectData = this.store.getProject(projectId);
      this.project = {
        name: projectData.name,
        sections: angular.copy(projectData.sections),
        tracks: [],
        tracksMap: {},
        playlists: []
      };
      projectData.tracks.forEach(this.addTrack.bind(this));

      if (projectData.playlists.length) {
        this.project.playlists = projectData.playlists;
        this.project.playlists.forEach(function(playlist, index) {
          playlist.id = index + 1;
        });
      } else {
        this.createPlaylist();
      }
      this.dispatchEvent('projectLoaded', this.project);
      return this.project;
    };

    ProjectManager.prototype.createSection = function(section) {
      var defaultConfig = {
        timeSignature: {
          top: 4,
          bottom: 4
        },
        bpm: 80,
        length: 3,
        beatsPerSlide: 1,
        beatsPerView: 10,
        animationDuration: 300
      };
      section = angular.merge(defaultConfig, section);
      section.id = generateItemId(this.project.sections);
      section.tracks = {};
      this.project.sections.push(section);
      this.section = section;
      console.log(section);
      return section;
    };

    ProjectManager.prototype.createPlaylist = function() {
      var playlist = {
        id: generateItemId(this.project.playlists),
        name: '',
        items: []
      };
      this.project.playlists.push(playlist);
      return playlist;
    };

    ProjectManager.prototype.importSection = function(section) {
      console.log('importSection');
      section.id = generateItemId(this.project.sections);
      console.log(section);
      this.project.sections.push(section);
      this.loadSection(section.id);
    };


    ProjectManager.prototype.deleteSection = function() {
      if (this.section) {
        var sectionId = this.section.id;
        this.store.deleteSection(sectionId);
        var index = this.project.sections.findIndex(byId(sectionId));
        this.project.sections.splice(index, 1);
      }
      this.saveProjectConfig();
      this.dispatchEvent('sectionDeleted');
    };


    ProjectManager.prototype.serializeSection = function(section) {

      var data = {
        name: section.name,
        timeSignature: section.timeSignature,
        length: section.length,
        beatsPerView: section.beatsPerView,
        beatsPerSlide: section.beatsPerSlide,
        animationDuration: section.animationDuration,
        bpm: section.bpm,
        tracks: {}
      }
      this.project.tracks.forEach(function(track) {
        var trackSection = section.tracks[track.id];
        if (trackSection) {
          // filter beats with some sounds only
          var trackData = trackSection.rawData().filter(function(beatData) {
            return beatData.data.length > 0;
          });
          data.tracks[track.id] = trackData;
          // data.tracks[track.id] = trackSection.rawData();
        }
      }, this);

      return JSON.stringify(data, null, 4);
    }


    ProjectManager.prototype.saveProjectConfig = function() {
      // Don't save when no sections exists
      if (!this.store.project) {
        return;
      }
      var trackExcludedProperties = ['id', 'instrument', 'audio', '_volume'];
      var tracks = this.project.tracks.map(function(track) {
        return Object.keys(track).reduce(function(obj, property) {
          if (trackExcludedProperties.indexOf(property) === -1) {
            obj[property] = track[property];
          }
          var muted = track.audio.gain.value <= 0.001;
          obj.volume = {
            muted: muted,
            value: muted? track._volume : track.audio.gain.value
          };
          return obj;
        }, {});
      });

      var sectionsIndex = this.project.sections.map(function(section) {
        return {
          id: section.id,
          name: section.name
        };
      });

      this.store.saveProjectConfig(tracks, sectionsIndex);
    };

    ProjectManager.prototype.saveSection = function() {
      console.log('ProjectManager.saveSection');
      if (!this.store.project) {
        this.store.createProject(this.project.name);
      }

      var sectionId = this.section.id;
      var data = this.serializeSection(this.section);
      this.store.saveSection(sectionId, this.section.name, data);

      var sectionRecord = this.project.sections.find(byId(sectionId));
      if (sectionRecord) {
        sectionRecord.name = this.section.name;
      }

      this.saveProjectConfig();
    };

    ProjectManager.prototype.saveAsNewSection = function(newName) {
      // var index = this.project.sections.findIndex(byId(this.section.id));

      this.section.id = generateItemId(this.project.sections);
      this.section.name = newName || "New";
      this.project.sections.push({
        id: this.section.id,
        name: this.section.name
      });
      this.saveSection();
    };

    ProjectManager.prototype.loadSectionData = function(section) {
      console.log('loadSectionData');
      console.log(section);

      for (var trackId in section.tracks) {
        var trackData = section.tracks[trackId];
        if (!trackData.audio) {
          var track = trackId.startsWith('bass')? new BassTrackSection(trackData) : new DrumTrackSection(trackData);
          track.audio = this.project.tracksMap[trackId].audio;
          track.instrument = this.project.tracksMap[trackId].instrument;
          section.tracks[trackId] = track;
        }
      }
      return section;
    }


    ProjectManager.prototype.getSection = function(sectionId) {
      console.log(this.project);
      var section = this.project.sections.find(byId(sectionId));
      if (!section) {
        console.log('invalid section id: '+sectionId);
        return;
      }

      // TODO: better section state marking/checking (loaded, converted, ...)
      if (section.tracks && section.tracks[this.project.tracks[0].id]) {
        if (angular.isFunction(section.tracks[this.project.tracks[0].id].beat)) {
          console.log('Already converted/loaded section');
          // already converted to Track
          return section;
        }
      }

      // empty section
      if (!section.tracks) {
        section.tracks = {};
      }

      console.log('--- load section from store ---');
      var storedSection = this.store.getSection(section.id);
      if (storedSection) {
        section = this.loadSectionData(storedSection);
      }
      return section;
    }


    ProjectManager.prototype.loadSection = function(sectionId) {
      console.log('loadSection: '+sectionId);
      this.section = this.getSection(sectionId);
      this.dispatchEvent('sectionLoaded', this.section);
    };

    ProjectManager.prototype.loadPlaylist = function(playlistId) {
      this.playlist = this.project.playlists.find(byId(playlistId));
      this.dispatchEvent('playlistLoaded', this.playlist);
    };

    ProjectManager.prototype.deletePlaylist = function(playlistId) {
      var index = this.project.playlists.findIndex(byId(playlistId));
      if (index !== -1) {
        this.project.playlists.splice(index, 1);
      }
    };

    ProjectManager.prototype._playlistsData = function() {
      return this.project.playlists.map(function(playlist) {
        return {
          name: playlist.name,
          items: playlist.items
        };
      });
    }
    ProjectManager.prototype.savePlaylists = function() {
      this.store.savePlaylists(this._playlistsData());
    };

    return new ProjectManager();
  }

})();