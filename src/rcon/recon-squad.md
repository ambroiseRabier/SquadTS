breaking change:

        this.emit(`CHAT_COMMAND:${command[1].toLowerCase()}`, {
          ...data,
          message: command[2].trim()
        });

remove "CHAT_COMMAND:" from it, event served by property `this.chatCommandEvent`
