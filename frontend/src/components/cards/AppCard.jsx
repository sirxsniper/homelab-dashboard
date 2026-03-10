import React from 'react';
import StatusPill from '../ui/StatusPill';
import ProxmoxCard from './card-bodies/ProxmoxCard';
import UnraidCard from './card-bodies/UnraidCard';
import JellyfinCard from './card-bodies/JellyfinCard';
import PlexCard from './card-bodies/PlexCard';
import AdguardCard from './card-bodies/AdguardCard';
import PiholeCard from './card-bodies/PiholeCard';
import UptimeKumaCard from './card-bodies/UptimeKumaCard';
import VaultwardenCard from './card-bodies/VaultwardenCard';
import NginxProxyCard from './card-bodies/NginxProxyCard';
import PortainerCard from './card-bodies/PortainerCard';
import GrafanaCard from './card-bodies/GrafanaCard';
import GenericCard from './card-bodies/GenericCard';
import AppIcon from '../ui/AppIcon';
import SonarrCard from './card-bodies/SonarrCard';
import RadarrCard from './card-bodies/RadarrCard';
import BazarrCard from './card-bodies/BazarrCard';
import ProwlarrCard from './card-bodies/ProwlarrCard';
import SabnzbdCard from './card-bodies/SabnzbdCard';
import QbittorrentCard from './card-bodies/QbittorrentCard';
import MetubeCard from './card-bodies/MetubeCard';
import TautulliCard from './card-bodies/TautulliCard';
import ImmichCard from './card-bodies/ImmichCard';
import NextcloudCard from './card-bodies/NextcloudCard';
import SearxngCard from './card-bodies/SearxngCard';
import OllamaCard from './card-bodies/OllamaCard';
import OpenWebuiCard from './card-bodies/OpenWebuiCard';
import FreshrssCard from './card-bodies/FreshrssCard';
import LinkdingCard from './card-bodies/LinkdingCard';
import NotifiarrCard from './card-bodies/NotifiarrCard';
import SpeedtestTrackerCard from './card-bodies/SpeedtestTrackerCard';
import Iperf3Card from './card-bodies/Iperf3Card';
import MariadbCard from './card-bodies/MariadbCard';
import RedisCard from './card-bodies/RedisCard';
import PhpmyadminCard from './card-bodies/PhpmyadminCard';
import LinuxCard from './card-bodies/LinuxCard';
import SeerrCard from './card-bodies/SeerrCard';
import UnifiCard from './card-bodies/UnifiCard';

const cardBodies = {
  proxmox: ProxmoxCard,
  unraid: UnraidCard,
  jellyfin: JellyfinCard,
  plex: PlexCard,
  adguard: AdguardCard,
  pihole: PiholeCard,
  uptime_kuma: UptimeKumaCard,
  vaultwarden: VaultwardenCard,
  nginx_proxy: NginxProxyCard,
  portainer: PortainerCard,
  grafana: GrafanaCard,
  sonarr: SonarrCard,
  radarr: RadarrCard,
  bazarr: BazarrCard,
  prowlarr: ProwlarrCard,
  sabnzbd: SabnzbdCard,
  qbittorrent: QbittorrentCard,
  metube: MetubeCard,
  tautulli: TautulliCard,
  immich: ImmichCard,
  nextcloud: NextcloudCard,
  searxng: SearxngCard,
  ollama: OllamaCard,
  open_webui: OpenWebuiCard,
  freshrss: FreshrssCard,
  linkding: LinkdingCard,
  notifiarr: NotifiarrCard,
  speedtest_tracker: SpeedtestTrackerCard,
  iperf3: Iperf3Card,
  mariadb: MariadbCard,
  redis_server: RedisCard,
  phpmyadmin: PhpmyadminCard,
  linux: LinuxCard,
  seerr: SeerrCard,
  unifi: UnifiCard,
  generic: GenericCard,
};

const cardSizes = {
  proxmox: 'full', unraid: 'full', linux: 'full',
  nginx_proxy: 'wide', uptime_kuma: 'wide', nextcloud: 'wide',
  searxng: 'small', iperf3: 'small', phpmyadmin: 'small',
};

const AppCard = React.memo(function AppCard({ app, onClick, index = 0 }) {
  const { data, type, name, icon, category } = app;
  const status = data?.error ? 'offline' : (data?.status || 'unknown');
  const CardBody = cardBodies[type] || GenericCard;
  const isServer = type === 'proxmox' || type === 'unraid' || type === 'linux';
  const size = cardSizes[type] || 'medium';

  return (
    <div
      className={`card-accent bg-s1 border border-bd rounded-[var(--radius-card)] p-[20px] cursor-pointer relative overflow-hidden
        transition-[border-color,background,transform,box-shadow] duration-150
        hover:border-bd2 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        animate-fadeUp ${status === 'offline' ? 'opacity-50' : ''} ${isServer ? 'server-card' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
      data-category={category}
      data-size={size}
    >
      <div className="flex items-start justify-between mb-[16px]">
        <div className="flex items-center gap-[10px]">
          <AppIcon type={type} icon={icon} size={34} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-[-0.3px] leading-[1.2] truncate">{name}</div>
            <div className="text-[10px] text-t3 uppercase tracking-[0.1em] font-medium mt-[2px]">{category}</div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {data?.error ? (
        <div className="text-center py-[16px] text-t3 text-[13px]">
          Host unreachable
        </div>
      ) : data ? (
        <CardBody data={data} appId={app.app_id} appUrl={app.open_url || app.url} sparkline={app.sparkline} />
      ) : (
        <div className="flex flex-col items-center justify-center py-[20px] text-t3">
          <div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" />
          <div className="text-[11px] mt-[8px]">Waiting for data...</div>
        </div>
      )}

      {app.open_url && !data?.error && data && (
        <button
          className="open-url-btn"
          onClick={(e) => { e.stopPropagation(); window.open(app.open_url, '_blank'); }}
        >
          <span>Open</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.index === next.index &&
    prev.app.app_id === next.app.app_id &&
    prev.app.data === next.app.data &&
    prev.app.sparkline === next.app.sparkline &&
    prev.app.open_url === next.app.open_url;
});

export default AppCard;
