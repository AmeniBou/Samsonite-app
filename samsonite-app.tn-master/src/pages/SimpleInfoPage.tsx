interface SimpleInfoPageProps {
  title: string;
  description: string;
}

const SimpleInfoPage = ({ title, description }: SimpleInfoPageProps) => {
  return (
    <div className="samsonite-container py-16">
      <h1 className="text-2xl font-bold tracking-wider mb-4">{title}</h1>
      <p className="text-muted-foreground max-w-3xl">{description}</p>
    </div>
  );
};

export default SimpleInfoPage;

