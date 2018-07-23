package main

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"time"

	"github.com/go-telegram-bot-api/telegram-bot-api"
)

type tgBot struct {
	api      *tgbotapi.BotAPI
	username string
}

func (bot *tgBot) load() {
	token := os.Getenv("TOKEN")
	api, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		log.Panic(err)
	}
	bot.api = api
}

func (bot *tgBot) run() {
	me, err := bot.api.GetMe()
	if err != nil {
		log.Panic(err)
	}
	bot.username = "@" + me.UserName

	conf := tgbotapi.NewUpdate(0)
	conf.Timeout = 60
	updates, err := bot.api.GetUpdatesChan(conf)
	if err != nil {
		log.Panic(err)
	}
	for update := range updates {
		bot.handle(&update)
	}
}

func (bot *tgBot) handle(update *tgbotapi.Update) {
	canHandle := func(message *tgbotapi.Message) bool {
		if message == nil {
			return false
		}
		if message.NewChatMembers != nil ||
			message.LeftChatMember != nil ||
			message.NewChatTitle != "" ||
			message.NewChatPhoto != nil ||
			message.DeleteChatPhoto != false ||
			message.GroupChatCreated != false ||
			message.SuperGroupChatCreated != false ||
			message.ChannelChatCreated != false ||
			message.MigrateToChatID != 0 ||
			message.MigrateFromChatID != 0 ||
			message.PinnedMessage != nil {
			return false
		}
		return true
	}

	isCommand := func(message *tgbotapi.Message) bool {
		return message.ReplyToMessage != nil && message.Text == bot.username
	}

	sendMessage := func(message *tgbotapi.Message, text string, replyto bool) {
		reply := tgbotapi.NewMessage(message.Chat.ID, text)
		if replyto {
			reply.ReplyToMessageID = message.MessageID
		}
		_, err := bot.api.Send(reply)
		if err != nil {
			log.Print(err)
		}
	}

	queryService := func(user, text string) string {
		var result string
		for i := 0; i < 3; i++ {
			conn, err := net.DialTimeout("tcp", "cscript:1024", time.Second*5)
			if err != nil {
				log.Print(err)
				continue
			}
			defer conn.Close()
			conn.Write([]byte(fmt.Sprintf("%s\x00%s\x00%s\x00", user, "", text)))
			result, _ = bufio.NewReader(conn).ReadString('\x00')
			break
		}
		return strings.Trim(result, " \n\r\x00")
	}

	smartReply := func(message *tgbotapi.Message) {
		user := "user"
		text := strings.Replace(message.Text, bot.username, "bot", -1)
		result := queryService(user, text)
		if len(result) > 0 {
			sendMessage(message, result, false)
		}
	}

	if message := update.Message; canHandle(message) {
		if isCommand(message) {
			message = message.ReplyToMessage
			sendMessage(message, "你说的对！", true)
		} else {
			smartReply(message)
		}
	} else if message := update.EditedMessage; canHandle(message) {
		smartReply(message)
	}
}

func main() {
	var bot tgBot
	bot.load()
	bot.run()
}
