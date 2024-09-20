"use strict";

const  atob=(a) =>{
  return Buffer.from(a, 'base64').toString('binary');
}

module.exports = atob;