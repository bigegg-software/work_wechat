async function xmlParse(xml) {
    return new Promise(reslove => {
      xml2js.parseString(xml, {
        trim: true
      }, function (err, result) {
        if (err) {
          return reslove()
        }
        reslove(result)
      })
    })
  }

  function formatMessage(result) {
    let message = {};
    if (typeof result === 'object') {
      for (var key in result) {
        if (!Array.isArray(result[key]) || result[key].length === 0) {
          continue;
        }
        if (result[key].length === 1) {
          let val = result[key][0];
          if (typeof val === 'object') {
            message[key] = formatMessage(val);
          } else {
            message[key] = (val || '').trim();
          }
        } else {
          message[key] = [];
          result[key].forEach(function (item) {
            message[key].push(formatMessage(item));
          });
        }
      }
    }
    return message;
  }
  module.exports = {
      xmlParse,
      formatMessage
  }