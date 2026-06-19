export const onRequestGet: PagesFunction = async () => {
  return Response.json({ ok: true, service: "sightread-nvidia-proxy" });
};
