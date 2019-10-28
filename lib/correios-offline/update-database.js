'use strict'

// log on files
const logger = require('console-files')
// list contracts from database
const database = require('./../database')
// handle each update queue by sender contract
const updateByContract = require('./update-by-contract')
// list of CEPs to calculate
const zipCodes = require('./../../assets/correios-offline/zip-codes.json')

const nextContract = (offset = 0) => {
  let retry = 0

  // get contract info one by one from local database first
  database.get(offset)

    .then(row => {
      if (row.code && row.password && row.zip) {
        // start calculating and saving results to Firestore for this contract
        updateByContract({
          nCdEmpresa: row.code,
          sDsSenha: row.password,
          nCdServico: row.service_codes,
          sCepOrigem: row.zip
        }).then(() => {
          // recursive call
          nextContract(offset++)
        })
      }
    })

    .catch(() => {
      retry++
      if (retry < 3) {
        // delay and try again
        setTimeout(() => {
          nextContract(offset)
        }, 10000)
      } else {
        logger.error(`Cannot get contract from database with offset ${offset}`)
      }
    })
}

module.exports = () => {
  // start with no contract for each listed zip code
  const nextZipCode = (index = 0) => {
    if (index < zipCodes.length) {
      updateByContract({
        nCdEmpresa: '',
        sDsSenha: '',
        sCepOrigem: zipCodes[index]
      }).then(() => {
        index++
        nextZipCode(index)
      })
    } else {
      // start with contracts
      nextContract()
    }
  }
  nextZipCode()
}