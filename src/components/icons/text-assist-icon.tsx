type Props = {
  className?: string;
};

export const TextAssistIcon = ({ className }: Props) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
    <path d="M7 9h6M7 12h4" />
    <path d="m7 16 1.6 1.6L12 14.2" />
    <path d="M19.5 2.5v4M17.5 4.5h4" />
  </svg>
);
