import type { Grade } from '@oss-idle/shared/judgement';
import type Skin from './Skin';
import { gradeKey } from './Skin';
import { useSkinImage } from './useSkinImage';

/** A skin's grade image, once read: the skin reads it the first time one is shown. */
export const useGradeUrl = (skin: Skin, grade: Grade, large = false) =>
	useSkinImage(skin, gradeKey(grade, large), () => skin.gradeUrl(grade, large));

type Props = { skin: Skin, grade: Grade, className: string, large: boolean };

export default function SkinGrade({ skin, grade, className, large }: Props) {
	const url = useGradeUrl(skin, grade, large);
	return <img
		className={`${className} skin__grade`}
		src={url}
		alt={`Grade ${grade}`}
		draggable={false}
	/>;
}
