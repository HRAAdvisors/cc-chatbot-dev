"use client";

import { Fragment } from "react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { MessageScrollerProvider, MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport } from "@/components/ui/message-scroller";
import type { useResourceChat } from "./useResourceChat";

function ReplyText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <Fragment key={index}>{part}</Fragment>);
}

export default function ResourceConversation({ chat }: {
  chat: ReturnType<typeof useResourceChat>;
}) {
  const { t } = useLanguage();
  if (!chat.messages.length && !chat.failed) return null;
  const lastQuestionId = [...chat.messages].reverse().find((message) => message.role === "user")?.id;

  return (
    <section aria-label={t("Conversation")} className="finder-page-conversation">
      <MessageScrollerProvider autoScroll={false}>
        <MessageScroller>
          <MessageScrollerViewport aria-label={t("Conversation")}>
            <MessageScrollerContent>
              {chat.messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id} id={message.id === lastQuestionId ? "latest-resource-question" : undefined}>
                  <Message align={message.role === "user" ? "end" : "start"}>
                    <MessageContent>
                      <MessageHeader>{t(message.role === "user" ? "You" : "Assistant")}</MessageHeader>
                      <Bubble variant={message.role === "user" ? "secondary" : "ghost"}>
                        <BubbleContent>
                          <p lang={message.locale} className="whitespace-pre-wrap break-words"><ReplyText text={message.content || t(message.incomplete ? "Reply stopped." : "Thinking…")} /></p>
                          {message.incomplete && message.content && <p className="text-sm text-muted-foreground">{t("Reply stopped.")}</p>}
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              {chat.failed && <Alert><AlertDescription>
                <p>{t("The assistant is unavailable right now. You can still search an address.")}</p>
                <Button variant="outline" size="sm" onClick={chat.retry}>{t("Retry")}</Button>
              </AlertDescription></Alert>}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
      <p role="status" className="sr-only">{t(chat.busy ? "Thinking…" : "Conversation updated.")}</p>
    </section>
  );
}
