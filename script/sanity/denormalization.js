// legislators: roles.state and state
reportList('legislators', 'state', {
  roles: {
    '$ne': []
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var value = this.roles[i].state;
      if (value !== this.state) {
        return true;
      }
    }
  }
}, "legislators with a role whose state is not the legislator's state");

// legislators: roles.chamber and chamber
reportList('legislators', 'chamber', {
  roles: {
    '$ne': []
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var value = this.roles[i].chamber;
      if (this.active && value !== 'joint' && value !== this.chamber) {
        return true;
      }
    }
  }
}, "legislators with a role whose chamber is neither 'joint' nor the legislator's chamber");

// legislators: roles.district and district
reportList('legislators', 'district', {
  'roles.district': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var value = this.roles[i].district;
      if (this.active && value && value !== this.district) {
        return true;
      }
    }
  }
}, "legislators with a role whose district is not the legislator's district");

// legislators: roles.party and party
reportList('legislators', 'party', {
  'roles.party': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var value = this.roles[i].party;
      if (value && value !== this.party) {
        return true;
      }
    }
  }
}, "legislators with a role whose party is not the legislator's party");

// legislators#roles.committee and committees#committee
// legislators#roles.subcommittee and committees#subcommittee
reportList('legislators', 'roles.committee_id', {
  'roles.committee_id': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var id = this.roles[i].committee_id;
      if (id) {
        var committee;
        if (this.roles[i].subcommittee) {
          var subcommittee = db.committees.findOne({_all_ids: id});
          if (subcommittee) {
            if (this.roles[i].subcommittee !== subcommittee.subcommittee) {
              return true;
            }
            committee = db.committees.findOne({_all_ids: subcommittee.parent_id});
            if (committee) {
              if (this.roles[i].committee !== committee.committee) {
                return true;
              }
            }
          }
        }
        else if (this.roles[i].committee) {
          committee = db.committees.findOne({_all_ids: id});
          if (committee) {
            if (this.roles[i].committee !== committee.committee) {
              return true;
            }
          }
        }
      }
    }
  }
}, "legislators with a role whose committee name is not the committee's name");

// legislators#roles.position and committees#members.role
reportList('legislators', 'roles.committee_id', {
  'roles.committee_id': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.roles.length; i < l; i++) {
      var value = this.roles[i].position;
      if (value) {
        var id = this.roles[i].committee_id;
        if (id) {
          var document = db.committees.findOne({_all_ids: id});
          if (document) {
            for (var j = 0, m = document.members.length; j < m; j++) {
              if (document.members[j].leg_id === this._id) {
                if (document.members[j].role !== value) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
  }
}, "legislators with a role whose position is not their position on the committee");

// bills#companions.bill_id and bills#bill_id through bills#companions.internal_id
// @note There is no index on bills#_all_ids, so we don't use that field here.
reportList('bills', 'companions.internal_id', {
  'companions.internal_id': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.companions.length; i < l; i++) {
      var id = this.companions[i].internal_id;
      if (id) {
        var document = db.bills.findOne({_id: id});
        if (document) {
          if (this.companions[i].bill_id !== document.bill_id) {
            return true;
          }
        }
      }
    }
  }
}, "bills with a companion whose bill ID is not the bill's bill ID");

reportList('votes', '+bill_session', {
  '+bill_session': {
    '$exists': true
  },
  '$where': function () {
    var document = db.bills.findOne({_id: this.bill_id});
    return document && this['+bill_session'] !== document.session;
  }
}, "votes whose bill session is not the bill's session");

reportList('votes', '+bill_session', {
  '+bill_session': {
    '$exists': true
  },
  '$where': function () {
    var document = db.bills.findOne({_id: this.bill_id});
    return document && this['+bill_session'] !== this.session;
  }
}, "votes whose bill session is not its session");



// bills#actions.related_entities.name and legislators#full_name or
//   committees#committee or committees#subcommittee
// @note It's common for names to differ, e.g. "Sears" versus "Dick W Sears" or
//   "Pensions and Retirement" versus "Pensions & Retirement".
if (verbose) {
  reportList('bills', 'actions.related_entities.id', {
    'actions.related_entities.id': {
      '$ne': null
    },
    '$where': function () {
      for (var i = 0, l = this.actions.length; i < l; i++) {
        if (this.actions[i].related_entities) {
          for (var j = 0, m = this.actions[i].related_entities.length; j < m; j++) {
            var entity = this.actions[i].related_entities[j];
            var id = entity.id;
            var value = entity.name;
            var document;
            if (id) {
              if (/C[0-9]{6}$/.test(id)) {
                document = db.committees.findOne({_all_ids: id});
                if (document) {
                  if (value !== document.committee && value !== document.subcommittee) {
                    return true;
                  }
                }
              }
              else if (/L[0-9]{6}$/.test(id)) {
                document = db.legislators.findOne({_all_ids: id});
                if (document) {
                  if (value !== document.full_name) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }, "bills with an action whose related entity's name is not that entity's name");
}

// bills#sponsors.name and legislators#full_name or committees#committee or
//   committees#subcommittee
// @note It's common for names to differ, e.g. "Joint Appropriations Interim 
//   Committee" versus "Appropriations" or "DAVIS" versus "Bettye Davis".
if (verbose) {
  reportList('bills', 'sponsors.name', {
    'sponsors.name': {
      '$exists': true
    },
    '$where': function () {
      for (var i = 0, l = this.sponsors.length; i < l; i++) {
        var id, document, value;
        if (id = this.sponsors[i].leg_id) {
          document = db.legislators.findOne({_all_ids: id});
          if (document) {
            value = this.sponsors[i].name;
            if (value !== document.full_name) {
              return true;
            }
          }
        }
        else if (id = this.sponsors[i].committee_id) {
          document = db.committees.findOne({_all_ids: id});
          if (document) {
            value = this.sponsors[i].name;
            if (value !== document.committee && value !== document.subcommittee) {
              return true;
            }
          }
        }
      }
    }
  }, "bills with a sponsor whose committee name is not the committee's name");
}

// committees#members.name and legislators#full_name
// @note It's common for names to differ, e.g. "James Doe" versus "Jim Doe".
if (verbose) {
  reportList('committees', 'members.leg_id', {
    'members.leg_id': {
      '$ne': null
    },
    '$where': function () {
      for (var i = 0, l = this.members.length; i < l; i++) {
        var id = this.members[i].leg_id;
        if (id) {
          var document = db.legislators.findOne({_all_ids: id});
          if (document) {
            if (this.members[i].name !== document.full_name) {
              return true;
            }
          }
        }
      }
    }
  }, "committees with a member whose name is not the legislator's name");
}

// @note It's common for names to differ, e.g. "Sales, Scott" versus "Scott Sales".
if (verbose) {
  // votes#yes_votes.name and legislators#full_name
  reportList('votes', 'yes_votes.leg_id', {
    'yes_votes.leg_id': {
      '$ne': null
    },
    '$where': function () {
      for (var i = 0, l = this.yes_votes.length; i < l; i++) {
        var id = this.yes_votes[i].leg_id;
        if (id) {
          var document = db.legislators.findOne({_all_ids: id});
          if (document) {
            if (this.yes_votes[i].name !== document.full_name) {
              return true;
            }
          }
        }
      }
    }
  }, "votes with a 'yes' voter whose name is not the legislator's name");

  // votes#no_votes.name and legislators#full_name
  reportList('votes', 'no_votes.leg_id', {
    'no_votes.leg_id': {
      '$ne': null
    },
    '$where': function () {
      for (var i = 0, l = this.no_votes.length; i < l; i++) {
        var id = this.no_votes[i].leg_id;
        if (id) {
          var document = db.legislators.findOne({_all_ids: id});
          if (document) {
            if (this.no_votes[i].name !== document.full_name) {
              return true;
            }
          }
        }
      }
    }
  }, "votes with a 'no' voter whose name is not the legislator's name");

  // votes#other_votes.name and legislators#full_name
  reportList('votes', 'other_votes.leg_id', {
    'other_votes.leg_id': {
      '$ne': null
    },
    '$where': function () {
      for (var i = 0, l = this.other_votes.length; i < l; i++) {
        var id = this.other_votes[i].leg_id;
        if (id) {
          var document = db.legislators.findOne({_all_ids: id});
          if (document) {
            if (this.other_votes[i].name !== document.full_name) {
              return true;
            }
          }
        }
      }
    }
  }, "votes with an 'other' voter whose name is not the legislator's name");
}

// @note It's common for names to differ, e.g. "A10" versus "A 10".
reportList('votes', '+bill_id', {
  '+bill_id': {
    '$exists': true
  },
  '$where': function () {
    var document = db.bills.findOne({_id: this.bill_id});
    return document && this['+bill_id'] !== document.bill_id;
  }
}, "votes whose bill ID is not the bill's ID");

// @note It's common for names to differ, e.g. "Joint Appropriations Interim 
//   Committee" versus "Appropriations".
if (verbose) {
  reportList('votes', 'committee', {
    committee: {
      '$exists': true
    },
    '$where': function () {
      var document = db.committees.findOne({_all_ids: this.committee_id});
      return document && this.committee !== document.committee && this.committee !== document.subcommittee;
    }
  }, "votes whose committee name is not the committee's name");
}



// bills: sponsors.chamber and chamber
// @todo It seems common practice in some states for representatives to be
//   primary on a bill and for a senator to be cosponsor. Needs clarification.
/*
reportList('bills', 'chamber', {
  'sponsors.chamber': {
    '$exists': true
  },
  '$where': function () {
    for (var i = 0, l = this.sponsors.length; i < l; i++) {
      var value = this.sponsors[i].chamber;
      if (value && value !== this.chamber) {
        return true;
      }
    }
  }
}, "bills with a sponsor whose chamber is not the bill's chamber");
*/