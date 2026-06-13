import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  adminListSettings,
  adminUpdateSettingDraft,
  adminPublishSetting,
} from "@/lib/site-management.functions";
import {
  LIVE_CHAT_DEFAULTS,
  type LiveChatWidgetSettings as LCWValue,
} from "@/components/site/LiveChatWidget";

const SETTING_KEY = "live_chat_widget";

function coerce(v: unknown): LCWValue {
  const o = (v ?? {}) as Partial<LCWValue>;
  const pos = o.position === "bottom-left" ? "bottom-left" : "bottom-right";
  return {
    enabled: Boolean(o.enabled),
    whatsapp_number: typeof o.whatsapp_number === "string" ? o.whatsapp_number : "",
    chat_message:
      typeof o.chat_message === "string" && o.chat_message.length > 0
        ? o.chat_message
        : LIVE_CHAT_DEFAULTS.chat_message,
    position: pos,
    heading:
      typeof o.heading === "string" && o.heading.length > 0
        ? o.heading
        : LIVE_CHAT_DEFAULTS.heading,
    subheading:
      typeof o.subheading === "string" && o.subheading.length > 0
        ? o.subheading
        : LIVE_CHAT_DEFAULTS.subheading,
  };
}

export function LiveChatWidgetSettingsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(adminListSettings);
  const updateDraft = useServerFn(adminUpdateSettingDraft);
  const publish = useServerFn(adminPublishSetting);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings", SETTING_KEY],
    queryFn: async () => {
      const res = await list();
      const row = (res.settings ?? []).find((r: { key: string }) => r.key === SETTING_KEY);
      return coerce(row?.draft_value ?? row?.published_value ?? {});
    },
  });

  const [form, setForm] = useState<LCWValue>(LIVE_CHAT_DEFAULTS);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (value: LCWValue) => {
      const normalized: LCWValue = {
        enabled: !!value.enabled,
        whatsapp_number: value.whatsapp_number.trim(),
        chat_message: value.chat_message.trim() || LIVE_CHAT_DEFAULTS.chat_message,
        position: value.position === "bottom-left" ? "bottom-left" : "bottom-right",
        heading: value.heading.trim() || LIVE_CHAT_DEFAULTS.heading,
        subheading: value.subheading.trim() || LIVE_CHAT_DEFAULTS.subheading,
      };
      await updateDraft({ data: { key: SETTING_KEY, draftValue: normalized } });
      await publish({ data: { key: SETTING_KEY } });
      return normalized;
    },
    onSuccess: () => {
      toast.success("Live chat widget saved");
      qc.invalidateQueries({ queryKey: ["admin", "settings", SETTING_KEY] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const numberOk = /^\+?\d{6,16}$/.test(form.whatsapp_number.trim());

  return (
    <section className="glass shadow-card-soft relative overflow-hidden rounded-3xl p-5">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "#25D36633" }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-background/40"
          style={{ boxShadow: "0 0 16px #25D36655" }}
        >
          <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Live Chat Widget Control</h2>
          <p className="text-xs text-muted-foreground">
            Floating chat bubble on the student dashboard. Updates reach all sessions within
            seconds — no refresh needed.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="relative mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/30 p-3">
            <div>
              <div className="text-sm font-semibold">Enable Live Chat Widget</div>
              <p className="text-xs text-muted-foreground">
                When OFF, the widget is hidden everywhere.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              WhatsApp Number
            </span>
            <Input
              value={form.whatsapp_number}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="+8801XXXXXXXXX"
              inputMode="tel"
              maxLength={20}
            />
            {!numberOk && form.whatsapp_number.length > 0 && (
              <span className="text-[11px] text-amber-500">
                Enter international format, digits only (6–16 digits, optional leading +).
              </span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Default Message
            </span>
            <Textarea
              value={form.chat_message}
              onChange={(e) => setForm((f) => ({ ...f, chat_message: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Panel Heading
              </span>
              <Input
                value={form.heading}
                onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
                maxLength={80}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Subheading
              </span>
              <Input
                value={form.subheading}
                onChange={(e) => setForm((f) => ({ ...f, subheading: e.target.value }))}
                maxLength={160}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Widget Position
            </span>
            <select
              value={form.position}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  position: e.target.value === "bottom-left" ? "bottom-left" : "bottom-right",
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="bottom-right">Bottom Right (default)</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </label>

          <div className="flex justify-end">
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || (form.enabled && !numberOk)}
              className="gap-2"
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save &amp; Publish
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
