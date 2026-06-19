import Button from "./ui/Button";

export default function PrimaryButton({ title, onPress, className = "" }) {
  return <Button title={title} onPress={onPress} className={className} />;
}
