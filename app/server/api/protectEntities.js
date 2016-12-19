/**
 * Created by tauvray on 12/17/16.
 */

var protect = {
    protectEntry : function(message) {
        // Return a the same string with escaped "<script>" tags to avoid code injection
        message = message.replace(/&/g, '&amp;');
        message = message.replace(/</g, '&lt;');
        message = message.replace(/>/g, '&gt;');
        return (message);
    }
}

module.exports = protect;
