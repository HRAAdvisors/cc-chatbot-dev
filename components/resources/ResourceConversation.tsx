"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Wifi } from "lucide-react";
import { Message, MessageContent } from "@/components/ui/message";
import { MessageScrollerProvider, MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport } from "@/components/ui/message-scroller";
import type { useResourceChat } from "./useResourceChat";

export function AssistantLabel() {
  return <span className="bace-assistant-head"><span className="bace-avatar" aria-hidden="true"><Wifi className="size-3.5" /></span>BACE Hub</span>;
}

function ReplyText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <Fragment key={index}>{part}</Fragment>);
}

export default function ResourceConversation({ chat, anchorId, anchors = {}, leading, footer, showFooter = false }: {
  chat: ReturnType<typeof useResourceChat>;
  anchorId?: string | null;
  anchors?: Record<string, ReactNode>;
  leading?: ReactNode;
  footer?: ReactNode;
  showFooter?: boolean;
}) {
  const { t } = useLanguage();
  const latest = chat.messages.at(-1);
  const latestLength = latest?.content.length ?? 0;
  const hasAnchorContent = !!anchorId && !!anchors[anchorId];

  useEffect(() => {
    const root = document.documentElement;
    if (root.scrollHeight - (window.scrollY + window.innerHeight) < 240) window.scrollTo({ top: root.scrollHeight, behavior: "instant" });
  }, [latest?.id, latestLength, chat.failed, showFooter]);

  useEffect(() => {
    if (!anchorId || !hasAnchorContent) return;
    document.getElementById(`message-${anchorId}`)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [anchorId, hasAnchorContent]);

  if (!chat.messages.length && !chat.failed && !leading && !showFooter) return null;

  return (
    <section aria-label={t("Conversation")} className="finder-page-conversation">
      <MessageScrollerProvider autoScroll={false}>
        <MessageScroller>
          <MessageScrollerViewport aria-label={t("Conversation")}>
            <MessageScrollerContent>
              {leading}
              {chat.messages.map((message) => (
                <Fragment key={message.id}>
                  <MessageScrollerItem messageId={message.id} id={`message-${message.id}`}>
                    <Message align={message.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        {message.role === "user" ? <span className="sr-only">{t("You")}</span> : <AssistantLabel />}
                        <Bubble variant={message.role === "user" ? "default" : "ghost"}>
                          <BubbleContent>
                            <p lang={message.locale} className="whitespace-pre-wrap break-words"><ReplyText text={message.content || t(message.incomplete ? "Reply stopped." : "Thinking…")} /></p>
                            {message.incomplete && message.content && <p className="text-sm text-muted-foreground">{t("Reply stopped.")}</p>}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                  {anchors[message.id] && <div className="finder-chat-results">{anchors[message.id]}</div>}
                </Fragment>
              ))}
              {chat.failed && <Alert><AlertDescription>
                <p>{t("The assistant is unavailable right now. You can still search an address.")}</p>
                <Button variant="outline" size="sm" onClick={chat.retry}>{t("Retry")}</Button>
              </AlertDescription></Alert>}
              {showFooter && <div className="flex flex-col gap-4">{footer}</div>}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
      <p role="status" className="sr-only">{t(chat.busy ? "Thinking…" : "Conversation updated.")}</p>
    </section>
  );
}
